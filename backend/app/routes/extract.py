import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import get_settings
from app.models.schemas.extract import ExtractResponse
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/extract", tags=["extract"])

settings = get_settings()

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/tiff", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}


async def _ocr_image(filepath: str) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="pytesseract/Pillow not installed",
        ) from None

    text = pytesseract.image_to_string(Image.open(filepath))
    return text.strip()


async def _ocr_pdf(filepath: str) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="pdf2image/pytesseract not installed",
        ) from None

    images = convert_from_path(filepath, dpi=300)
    texts: list[str] = []
    for img in images:
        text = pytesseract.image_to_string(img)
        texts.append(text.strip())

    return "\n\n---\n\n".join(texts)


@router.post("/image", response_model=ExtractResponse)
async def extract_image_text(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if file.content_type not in ALLOWED_IMAGE_TYPES and file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
        )

    upload_dir = os.path.join(settings.media_root, "extract")
    os.makedirs(upload_dir, exist_ok=True)

    file_id = uuid.uuid4().hex
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png"
    dest = os.path.join(upload_dir, f"{file_id}.{ext}")
    with open(dest, "wb") as f:
        f.write(content)

    text = await _ocr_image(str(dest))

    if not text:
        text = "[No text detected in image]"

    return ExtractResponse(filename=file.filename or "unknown", text=text)


@router.post("/pdf", response_model=ExtractResponse)
async def extract_pdf_text(
    file: Annotated[UploadFile, File()],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type: {file.content_type}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
        )

    upload_dir = os.path.join(settings.media_root, "extract")
    os.makedirs(upload_dir, exist_ok=True)

    file_id = uuid.uuid4().hex
    dest = os.path.join(upload_dir, f"{file_id}.pdf")
    with open(dest, "wb") as f:
        f.write(content)

    text = await _ocr_pdf(str(dest))

    if not text:
        text = "[No text detected in PDF]"

    return ExtractResponse(filename=file.filename or "unknown", text=text)
