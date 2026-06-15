import json
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.domain.models import GeneratedVideo, User
from src.repositories.video import VideoRepository
from src.schemas.video import (
    AssembleRequest,
    AssembleResponse,
    HistoryResponse,
    ScriptRequest,
    ScriptResponse,
    VideoHistoryItem,
    VisualsRequest,
    VisualsResponse,
    VoiceRequest,
    VoiceResponse,
)

router = APIRouter(prefix="/api/video", tags=["video"])

settings = get_settings()


@router.post("/script", response_model=ScriptResponse)
async def generate_script(
    body: ScriptRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Generate a video script/timeline from a topic."""
    from src.services.llm import chat_completion

    prompt = (
        f"Create a short-form video script (≤60 seconds) about '{body.topic}'. "
        "Return ONLY valid JSON matching this schema:\n"
        '{"title": str, "duration": float, "scenes": [{type: "code"|"explainer"|"intro", start: float, end: float, content: str, code: str|null, language: str|null, highlight_lines: list[int]|null, camera_focus: list[int]|null}]}\n'
        "Each scene should alternate between code and explainer segments. "
        "Total duration must equal sum of all scene durations. "
        "No markdown wrapping."
    )

    response_text = await chat_completion(
        model=settings.default_llm_model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4096,
    )

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse script response from LLM",
        )

    return ScriptResponse(**data)


@router.post("/voice", response_model=VoiceResponse)
async def generate_voice(
    body: VoiceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Convert text to speech using Kokoro TTS."""
    try:
        from kokoro import KPipeline
        import soundfile as sf
        import numpy as np
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="TTS dependencies not installed",
        )

    output_dir = os.path.join(settings.media_root, "audio")
    os.makedirs(output_dir, exist_ok=True)

    pipeline = KPipeline(lang_code="a")
    generator = pipeline(body.text, voice=body.voice, speed=body.speed)

    all_audio: list[np.ndarray] = []
    for _, (_, _, audio) in enumerate(generator):
        if audio is not None and len(audio) > 0:
            all_audio.append(audio)

    if not all_audio:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No audio generated",
        )

    full_audio = np.concatenate(all_audio, axis=0)
    file_id = uuid.uuid4().hex
    output_path = os.path.join(output_dir, f"{file_id}.wav")
    sf.write(output_path, full_audio, 24000)

    return VoiceResponse(audio_path=output_path)


@router.post("/visuals", response_model=VisualsResponse)
async def generate_visuals(
    body: VisualsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Render code as a syntax-highlighted image."""
    try:
        from pygments import highlight
        from pygments.lexers import get_lexer_by_name
        from pygments.formatters import ImageFormatter
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Pygments not installed",
        )

    output_dir = os.path.join(settings.media_root, "visuals")
    os.makedirs(output_dir, exist_ok=True)

    lexer = get_lexer_by_name(body.language or "python")
    formatter = ImageFormatter(
        style=body.theme or "atom-one-dark",
        line_numbers=True,
        image_format="PNG",
        font_size=20,
        bg_color=body.bg_color or "#0d0f14",
    )

    file_id = uuid.uuid4().hex
    output_path = os.path.join(output_dir, f"{file_id}.png")

    with open(output_path, "wb") as f:
        highlight(body.code, lexer, formatter, f)

    return VisualsResponse(image_path=output_path)


@router.post("/assemble", response_model=AssembleResponse)
async def assemble_video(
    body: AssembleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Assemble audio + visuals into a final video via FFmpeg."""
    output_dir = os.path.join(settings.media_root, "videos")
    os.makedirs(output_dir, exist_ok=True)

    segments: list[str] = []
    for i, scene in enumerate(body.timeline.scenes):
        segment_path = os.path.join(output_dir, f"seg_{i}.mp4")
        audio_path = os.path.join(settings.media_root, "audio", f"scene_{i}.wav")

        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i",
            f"color=c=#0d0f14:s=1080x1920:d={scene.end - scene.start}",
        ]

        if os.path.exists(audio_path):
            cmd += ["-i", audio_path, "-c:a", "aac", "-shortest"]

        cmd += [
            "-c:v", "libx264", "-preset", "ultrafast",
            "-pix_fmt", "yuv420p", segment_path,
        ]

        import subprocess
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"FFmpeg segment {i} failed: {result.stderr}",
            )
        segments.append(segment_path)

    concat_file = os.path.join(output_dir, "concat_list.txt")
    with open(concat_file, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")

    output_name = body.output_name or f"{uuid.uuid4().hex}.mp4"
    output_path = os.path.join(output_dir, output_name)

    result = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", concat_file, "-c", "copy", output_path],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FFmpeg concat failed: {result.stderr}",
        )

    video = GeneratedVideo(
        user_id=current_user.id,
        title=body.title,
        video_path=output_path,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    video_url = f"/api/media/{os.path.basename(output_path)}"

    return AssembleResponse(video_path=output_path, video_url=video_url)


@router.get("/history", response_model=HistoryResponse)
async def get_video_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retrieve the current user's video generation history."""
    repo = VideoRepository(db)
    videos = await repo.list_by_user(current_user.id)

    items = [
        VideoHistoryItem(
            id=str(v.id),
            title=v.title,
            video_url=f"/api/media/{os.path.basename(v.video_path)}",
            created_at=v.created_at.isoformat() if v.created_at else datetime.now(timezone.utc).isoformat(),
        )
        for v in videos
    ]

    return HistoryResponse(videos=items)
