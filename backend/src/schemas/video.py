
from pydantic import BaseModel


class Scene(BaseModel):
    """
    Purpose:
        Defines a single scene in a video timeline.

    Attributes:
        type (str): Scene category ("code", "explainer", "intro").
        start (float): Start time in seconds.
        end (float): End time in seconds.
        content (str): Text content to be spoken.
        code (Optional[str]): Source code to display for "code" scenes.
        language (Optional[str]): Programming language for syntax highlighting.
        highlight_lines (Optional[list[int]]): Specific lines to highlight.
        camera_focus (Optional[list[int]]): Line range [start, end] for camera focus.
    """
    type: str # "code", "explainer", "intro"
    start: float
    end: float
    content: str # The text to speak
    code: str | None = None
    language: str | None = "python"
    highlight_lines: list[int] | None = []
    camera_focus: list[int] | None = [] # [start_line, end_line]

class VideoTimeline(BaseModel):
    """
    Purpose:
        Defines the structured sequence of scenes and total duration for a video.

    Attributes:
        title (str): Title of the video.
        duration (float): Total length in seconds.
        scenes (list[Scene]): Ordered list of scenes.
    """
    title: str
    duration: float
    scenes: list[Scene]

class ScriptRequest(BaseModel):
    """
    Purpose:
        Request schema for generating a video script from a topic.

    Attributes:
        topic (str): The subject of the video.
    """
    topic: str

class ScriptResponse(VideoTimeline):
    """
    Purpose:
        Response schema for generated video scripts.
    """
    pass

class VoiceRequest(BaseModel):
    """
    Purpose:
        Request schema for text-to-speech synthesis.

    Attributes:
        text (str): Text to be spoken.
        voice (Optional[str]): Voice model identifier.
        speed (Optional[float]): Speech playback speed.
    """
    text: str
    voice: str | None = "af_heart"
    speed: float | None = 1.1

class VoiceResponse(BaseModel):
    """
    Purpose:
        Response schema for text-to-speech synthesis.

    Attributes:
        audio_path (str): Path to the generated audio file.
    """
    audio_path: str

class VisualsRequest(BaseModel):
    """
    Purpose:
        Request schema for generating code visual assets.

    Attributes:
        code (str): Source code to render.
        language (Optional[str]): Programming language for syntax highlighting.
        theme (Optional[str]): Visual theme for the render.
        bg_color (Optional[str]): Background color hex code.
    """
    code: str
    language: str | None = "python"
    theme: str | None = "atom-one-dark"
    bg_color: str | None = "#0d0f14"

class VisualsResponse(BaseModel):
    """
    Purpose:
        Response schema for generated visual assets.

    Attributes:
        image_path (str): Path to the generated image file.
    """
    image_path: str

class AssembleRequest(BaseModel):
    """
    Purpose:
        Request schema for assembling audio and visuals into a final video.

    Attributes:
        title (str): Title of the video.
        timeline (VideoTimeline): Structured sequence of scenes.
        output_name (Optional[str]): Target filename for the output video.
    """
    title: str
    timeline: VideoTimeline
    output_name: str | None = "final_short.mp4"

class AssembleResponse(BaseModel):
    """
    Purpose:
        Response schema for assembled video assets.

    Attributes:
        video_path (str): Path to the final video file.
        video_url (str): URL for accessing the video.
    """
    video_path: str
    video_url: str

class VideoHistoryItem(BaseModel):
    """
    Purpose:
        Representation of a single video entry in user history.

    Attributes:
        id (str): Unique video identifier.
        title (str): Video title.
        video_url (str): URL to the video.
        created_at (str): Timestamp of creation.
    """
    id: str
    title: str
    video_url: str
    created_at: str

class HistoryResponse(BaseModel):
    """
    Purpose:
        Response schema for retrieving video history.

    Attributes:
        videos (list[VideoHistoryItem]): List of previously generated videos.
    """
    videos: list[VideoHistoryItem]
