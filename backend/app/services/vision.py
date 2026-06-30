import base64
import logging

from app.config import get_settings
from app.services.llm_client import LiteLLMClient

logger = logging.getLogger(__name__)

_IMAGE_MIME_PREFIXES = ("image/",)
_IMAGE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".tiff", ".webp", ".bmp"})

_SUPPORTED_VISION_FORMATS = frozenset({"png", "jpg", "jpeg", "webp"})


def is_image_mime(mime_type: str | None) -> bool:
    return mime_type is not None and mime_type.startswith(_IMAGE_MIME_PREFIXES)


def is_image_filename(filename: str) -> bool:
    dot = filename.lower().rfind(".")
    if dot == -1:
        return False
    return filename[dot:] in _IMAGE_EXTENSIONS


async def caption_image(image_bytes: bytes, mime_type: str | None = None) -> str | None:
    settings = get_settings()
    if not settings.image_captioning_enabled:
        return None

    model = settings.vision_model
    ext = _mime_to_ext(mime_type) or "jpg"
    if ext not in _SUPPORTED_VISION_FORMATS:
        logger.info(f"Unsupported vision format '{ext}', skipping captioning")
        return None

    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:image/{ext};base64,{b64}"

    prompt = (
        "Describe this image in detail, focusing on visible content, "
        "text, charts, diagrams, or people. "
        "Be factual and concise (2-4 sentences)."
    )

    try:
        client = LiteLLMClient(model=model)
        response = await client.generate_with_images(
            prompt=prompt,
            images=[data_uri],
        )
        caption = response.strip()
        logger.info(f"Generated image caption ({len(caption)} chars)")
        return caption or None
    except Exception as exc:
        logger.warning(f"Image captioning failed: {exc}")
        return None


def _mime_to_ext(mime_type: str | None) -> str | None:
    if mime_type is None:
        return None
    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/tiff": "tiff",
        "image/bmp": "bmp",
    }
    return mapping.get(mime_type)
