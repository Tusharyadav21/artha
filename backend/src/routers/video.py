from typing import Annotated
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import traceback
import logging
from src.auth.dependencies import get_current_user
from src.domain.models import User
from src.schemas.video import (
    ScriptRequest, ScriptResponse,
    VoiceRequest, VoiceResponse,
    VisualsRequest, VisualsResponse,
    AssembleRequest, AssembleResponse,
    HistoryResponse, VideoHistoryItem
)
from src.services.video_gen import VideoGenService
from src.domain.models import User, GeneratedVideo
from src.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

router = APIRouter(prefix="/api/video", tags=["video"])

# Dependency to get the service
def get_video_service():
    return VideoGenService()

@router.post("/draft/script", response_model=ScriptResponse)
async def generate_script(
    req: ScriptRequest, 
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
    try:
        return await service.generate_script(req.topic)
    except Exception as e:
        logging.error(f"Error in generate_script: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft/voice", response_model=VoiceResponse)
async def generate_voice(
    req: VoiceRequest, 
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
    try:
        path = await service.synthesize_voice(req.text, req.voice, req.speed)
        return VoiceResponse(audio_path=path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft/visuals", response_model=VisualsResponse)
async def generate_visuals(
    req: VisualsRequest, 
    current_user: Annotated[User, Depends(get_current_user)],
    service: VideoGenService = Depends(get_video_service)
):
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
