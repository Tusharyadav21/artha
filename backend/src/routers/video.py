from typing import Annotated
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import traceback
import logging
from src.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
from src.domain.models import User
from src.schemas.video import (
    ScriptRequest, ScriptResponse,
    VoiceRequest, VoiceResponse,
    VisualsRequest, VisualsResponse,
    AssembleRequest, AssembleResponse,
    HistoryResponse, VideoHistoryItem
)
from src.services.video_gen import VideoGenService
from src.domain.models import GeneratedVideo
from src.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

router = APIRouter(prefix="/api/video", tags=["video"])

# Dependency to get the service
def get_video_service():
    """
    Purpose:
        Provides a VideoGenService instance as a FastAPI dependency.

    Returns:
        VideoGenService:
            An initialized video generation service.
    """
    return VideoGenService()

@router.post("/draft/script", response_model=ScriptResponse)
async def generate_script(
    req: ScriptRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
    """
    Purpose:
        Generates a video script based on a provided topic.

    Args:
        req (ScriptRequest):
            Request containing the script topic.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        service (VideoGenService):
            Video generation service dependency.

    Returns:
        ScriptResponse:
            The generated script and associated metadata.

    Raises:
        HTTPException:
            500 Internal Server Error if script generation fails.

    Flow:
        1. Invoke the VideoGenService to generate a script for the given topic.
        2. Return the response or raise an exception on failure.
    """
    try:
        return await service.generate_script(req.topic)
    except Exception as e:
        logger.error(f"Error in generate_script: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft/voice", response_model=VoiceResponse)
async def generate_voice(
    req: VoiceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
    """
    Purpose:
        Synthesizes a voice-over audio file from text.

    Args:
        req (VoiceRequest):
            Request containing text, voice selection, and speed.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        service (VideoGenService):
            Video generation service dependency.

    Returns:
        VoiceResponse:
            Path to the generated audio file.

    Raises:
        HTTPException:
            500 Internal Server Error if voice synthesis fails.

    Flow:
        1. Call VideoGenService to synthesize voice from input text and settings.
        2. Return the path to the output audio file.
    """
    try:
        path = await service.synthesize_voice(req.text, req.voice, req.speed)
        return VoiceResponse(audio_path=path)
    except Exception as e:
        logger.error(f"Error in generate_voice: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft/visuals", response_model=VisualsResponse)
async def generate_visuals(
    req: VisualsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
    """
    Purpose:
        Renders visual assets (e.g., code snippets) for the video.

    Args:
        req (VisualsRequest):
            Request containing code, language, theme, and background color.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        service (VideoGenService):
            Video generation service dependency.

    Returns:
        VisualsResponse:
            Path to the generated visual asset.

    Raises:
        HTTPException:
            500 Internal Server Error if rendering fails.

    Flow:
        1. Invoke VideoGenService to render visuals based on code and style settings.
        2. Return the path to the rendered image.
    """
    try:
        path = await service.render_visuals(req.code, req.language, req.theme, req.bg_color)
        return VisualsResponse(image_path=path)
    except Exception as e:
        logging.error(f"Error in generate_visuals: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/finalize", response_model=AssembleResponse)
async def finalize_video(
    req: AssembleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: VideoGenService = Depends(get_video_service)
):
    """
    Purpose:
        Assembles all draft assets into a final video file.

    Responsibilities:
        - Trigger final video assembly
        - Persist result to video history

    Args:
        req (AssembleRequest):
            Request containing timeline, output name, and title.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

        service (VideoGenService):
            Video generation service dependency.

    Returns:
        AssembleResponse:
            Path and download URL of the final video.

    Raises:
        HTTPException:
            500 Internal Server Error if assembly fails.

    Side Effects:
        - Creates a GeneratedVideo record in the database.

    Flow:
        1. Call VideoGenService to assemble the video based on the timeline.
        2. Create a GeneratedVideo record with the resulting path.
        3. Persist record to database.
        4. Return the final video path and download URL.
    """
    try:
        path = await service.assemble_video(req.timeline.model_dump(), req.output_name)

        # Save to history
        video = GeneratedVideo(
            user_id=current_user.id,
            title=req.title,
            video_path=path,
            # We don't store paths for these anymore as they are generated in Remotion
            audio_path=None,
            image_path=None
        )
        db.add(video)
        await db.commit()

        return AssembleResponse(
            video_path=path,
            video_url=f"/api/video/download?path={path}"
        )
    except Exception as e:
        logging.error(f"Error in finalize_video: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=HistoryResponse)
async def list_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Purpose:
        Retrieves a history of generated videos for the authenticated user.

    Args:
        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        HistoryResponse:
            A list of generated videos sorted by creation date (descending).

    Raises:
        HTTPException:
            500 Internal Server Error if database query fails.

    Flow:
        1. Execute a SELECT query on GeneratedVideo filtered by user_id.
        2. Order results by created_at descending.
        3. Map database records to VideoHistoryItem schemas.
        4. Return the history response.
    """
    try:
        stmt = select(GeneratedVideo).where(
            GeneratedVideo.user_id == current_user.id
        ).order_by(GeneratedVideo.created_at.desc())

        result = await db.execute(stmt)
        videos = result.scalars().all()

        return HistoryResponse(
            videos=[
                VideoHistoryItem(
                    id=str(v.id),
                    title=v.title,
                    video_url=f"/api/video/download?path={v.video_path}",
                    created_at=v.created_at.isoformat()
                ) for v in videos
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_file(path: str, current_user: Annotated[User, Depends(get_current_user)]):
    """
    Purpose:
        Serves a generated video, audio, or image file for download.

    Responsibilities:
        - Validate that requested path is within the 'outputs' directory (prevent path traversal)
        - Check if file exists on disk
        - Determine correct MIME type based on file extension

    Args:
        path (str):
            Relative path to the file to download.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

    Returns:
        FileResponse:
            The binary content of the requested file.

    Raises:
        HTTPException:
            403 Forbidden if path is outside the outputs directory.
            404 Not Found if the file does not exist.

    Flow:
        1. Resolve absolute paths for the base outputs directory and the request.
        2. Verify the requested path starts with the base directory.
        3. Verify file existence.
        4. Select MIME type (video/mp4, image/png, audio/wav) based on extension.
        5. Return the file as a response.
    """
    # Security: Ensure we only serve files from the outputs directory
    base_dir = os.path.abspath("outputs")
    requested_path = os.path.abspath(path)

    if not requested_path.startswith(base_dir):
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(requested_path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = "video/mp4"
    if requested_path.endswith(".png"):
        media_type = "image/png"
    elif requested_path.endswith(".wav"):
        media_type = "audio/wav"

    return FileResponse(requested_path, media_type=media_type, filename=os.path.basename(requested_path))
