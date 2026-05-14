from pydantic import BaseModel
from typing import Optional, List

class Scene(BaseModel):
    type: str # "code", "explainer", "intro"
    start: float
    end: float
    content: str # The text to speak
    code: Optional[str] = None
    language: Optional[str] = "python"
    highlight_lines: Optional[list[int]] = []
    camera_focus: Optional[list[int]] = [] # [start_line, end_line]

class VideoTimeline(BaseModel):
    title: str
    duration: float
    scenes: list[Scene]

class ScriptRequest(BaseModel):
    topic: str

class ScriptResponse(VideoTimeline):
    pass

class VoiceRequest(BaseModel):
    text: str
    voice: Optional[str] = "af_heart"
    speed: Optional[float] = 1.1

class VoiceResponse(BaseModel):
    audio_path: str

class VisualsRequest(BaseModel):
    code: str
    language: Optional[str] = "python"
    theme: Optional[str] = "atom-one-dark"
    bg_color: Optional[str] = "#0d0f14"

class VisualsResponse(BaseModel):
    image_path: str

class AssembleRequest(BaseModel):
    title: str
    timeline: VideoTimeline
    output_name: Optional[str] = "final_short.mp4"

class AssembleResponse(BaseModel):
    video_path: str
    video_url: str

class VideoHistoryItem(BaseModel):
    id: str
    title: str
    video_url: str
    created_at: str

class HistoryResponse(BaseModel):
    videos: list[VideoHistoryItem]
