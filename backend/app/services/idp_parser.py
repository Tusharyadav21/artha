import asyncio
import logging
import os
import tempfile
import uuid
from functools import partial
from typing import Any

import fitz  # PyMuPDF
import instructor
import pdfplumber
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.document import DocumentTemplate
from app.models.schemas.idp import ExtractionTemplate, GenericDocumentSchema

logger = logging.getLogger(__name__)
settings = get_settings()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")


async def fast_extract_text(source_bytes: bytes) -> str:
    """
    Extracts the first page's text rapidly using PyMuPDF.
    """
    try:
        # fitz allows opening from bytes
        doc = fitz.open(stream=source_bytes, filetype="pdf")
        if len(doc) == 0:
            return ""
        page = doc[0]
        text = page.get_text("text")
        doc.close()
        return text or ""
    except Exception as e:
        logger.warning(f"PyMuPDF fast extract failed: {e}")
        return ""


async def classify_document(
    db: AsyncSession, project_id: uuid.UUID, first_page_text: str
) -> tuple[DocumentTemplate | None, ExtractionTemplate | None]:
    """
    Matches the first page text against known project templates.
    """
    text_lower = first_page_text.lower()
    
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.project_id == project_id)
    )
    templates = result.scalars().all()

    for tmpl in templates:
        keywords = [kw.lower() for kw in tmpl.keywords]
        # Match if all keywords are present, or any? Let's say ALL keywords must be present
        if keywords and all(kw in text_lower for kw in keywords):
            try:
                schema = ExtractionTemplate(**tmpl.schema_mapping)
                return tmpl, schema
            except Exception as e:
                logger.error(f"Invalid schema mapping for template {tmpl.id}: {e}")

    return None, None


def parse_with_coordinates(source_bytes: bytes, schema: ExtractionTemplate) -> dict[str, Any]:
    """
    Uses pdfplumber to extract text from exact coordinates.
    """
    logger.info("Starting deterministic PDF extraction...")
    extracted_data = {}
    
    try:
        import io
        pdf_stream = io.BytesIO(source_bytes)
        with pdfplumber.open(pdf_stream) as doc:
            for field_name, bbox_info in schema.fields.items():
                page_idx = bbox_info.page - 1
                if page_idx < 0 or page_idx >= len(doc.pages):
                    continue
                
                page = doc.pages[page_idx]
                x0, top, x1, bottom = bbox_info.bbox
                x0, top = max(0, x0), max(0, top)
                x1, bottom = min(page.width, x1), min(page.height, bottom)
                cropped = page.within_bbox((x0, top, x1, bottom))
                text = cropped.extract_text()
                extracted_data[field_name] = text.strip() if text else None
                
            # 2. Extract dynamic table area across multiple pages
            if schema.table_area:
                in_table = False
                parsed_table = []
                cols = schema.table_area.columns
                
                for page in doc.pages:
                    words = page.extract_words()
                    
                    start_trigger_word = schema.table_area.start_trigger.split()[0].lower()
                    end_trigger_word = schema.table_area.end_trigger.split()[0].lower()
                    
                    crop_top = schema.table_area.page_top_margin
                    crop_bottom = schema.table_area.page_bottom_margin
                    
                    start_word = next(
                        (w for w in words if start_trigger_word in w["text"].lower()), None
                    ) if not in_table else None
                    
                    if start_word:
                        in_table = True
                        crop_top = start_word["bottom"]
                        logger.info(
                            f"Found Start Trigger '{schema.table_area.start_trigger}' "
                            f"on Page {page.page_number} at Y={crop_top:.1f}"
                        )
                        
                    if in_table:
                        end_word = next(
                            (
                                w for w in words
                                if end_trigger_word in w["text"].lower()
                                and w["top"] > crop_top
                            ),
                            None,
                        )
                        
                        if end_word:
                            crop_bottom = end_word["top"]
                            logger.info(
                                f"Found End Trigger '{schema.table_area.end_trigger}' "
                                f"on Page {page.page_number} at Y={crop_bottom:.1f}"
                            )
                            
                        x0, top, x1, bottom = 0, crop_top, page.width, crop_bottom
                        x0, top = max(0, x0), max(0, top)
                        x1, bottom = min(page.width, x1), min(page.height, bottom)
                        
                        if bottom > top:
                            logger.info(
                                "Cropping Page %s: Y=%.1f–%.1f",
                                page.page_number, top, bottom,
                            )
                            cropped = page.within_bbox((x0, top, x1, bottom))
                            
                            # Bulletproof deterministic extraction (bypass pdfplumber table logic)
                            words_in_crop = cropped.extract_words()
                            if not words_in_crop:
                                continue
                                
                            # Sort words by Y coordinate, then X coordinate
                            words_in_crop.sort(key=lambda w: (w["top"], w["x0"]))
                            
                            rows = []
                            current_row = []
                            current_top = words_in_crop[0]["top"]
                            
                            for w in words_in_crop:
                                if abs(w["top"] - current_top) > 3.0:  # 3px tolerance (same row)
                                    rows.append(current_row)
                                    current_row = []
                                    current_top = w["top"]
                                current_row.append(w)
                            if current_row:
                                rows.append(current_row)
                                
                            # Now map each row into the vertical line buckets
                            vertical_lines = schema.table_area.vertical_lines
                            num_cols = len(vertical_lines) - 1
                            
                            for row_words in rows:
                                row_data = [[] for _ in range(num_cols)]
                                for w in row_words:
                                    # Find column bucket based on word center X
                                    word_center = (w["x0"] + w["x1"]) / 2
                                    col_idx = 0
                                    for j in range(num_cols):
                                        if vertical_lines[j] <= word_center < vertical_lines[j+1]:
                                            col_idx = j
                                            break
                                        if word_center >= vertical_lines[-1]:
                                            col_idx = num_cols - 1
                                            
                                    row_data[col_idx].append(w["text"])
                                    
                                final_row = [" ".join(col).strip() for col in row_data]
                                if not any(final_row):
                                    continue
                                    
                                row_dict = {}
                                for i, col_name in enumerate(cols):
                                    row_dict[col_name] = final_row[i] if i < len(final_row) else ""
                                parsed_table.append(row_dict)
                                
                            logger.info(f"Extracted {len(rows)} rows from Page {page.page_number}")
                                    
                        if end_word:
                            in_table = False
                            logger.info("Finished table extraction due to end trigger.")
                            break # Done extracting
                            
                if parsed_table:
                    logger.info(
                        f"Successfully accumulated {len(parsed_table)} total rows across all pages."
                    )
                    extracted_data["table"] = parsed_table
    except Exception as e:
        logger.error(f"Coordinate extraction failed: {e}")
        
    return extracted_data


# ---------------------------------------------------------------------------
# Surya OCR — replaces deprecated pytesseract
# ---------------------------------------------------------------------------

# Surya models loaded once and cached
_surya_det_model = None
_surya_det_processor = None
_surya_rec_model = None
_surya_rec_processor = None


async def run_ocr(source_bytes: bytes) -> str:
    """
    OCR using Surya (surya-ocr) for scanned documents.
    Falls back gracefully if Surya models fail to load.
    """
    global _surya_det_model, _surya_det_processor, _surya_rec_model, _surya_rec_processor

    try:
        if _surya_det_model is None:
            from surya.model.detection import load_model as load_det_model
            from surya.model.detection import load_processor as load_det_processor
            from surya.model.recognition import load_model as load_rec_model
            from surya.model.recognition import load_processor as load_rec_processor

            _surya_det_model, _surya_det_processor = load_det_model(), load_det_processor()
            _surya_rec_model, _surya_rec_processor = load_rec_model(), load_rec_processor()

        from surya.ocr import run_ocr as surya_run_ocr
        from PIL import Image
        import fitz

        images = []
        doc = fitz.open(stream=source_bytes, filetype="pdf")
        for i in range(len(doc)):
            page = doc[i]
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        doc.close()

        texts = []
        for img in images:
            # run_ocr is CPU-bound; offload to thread pool
            fn = partial(
                surya_run_ocr,
                [img], ["en"],
                _surya_det_model, _surya_det_processor,
                _surya_rec_model, _surya_rec_processor,
            )
            predictions = await asyncio.to_thread(fn)
            if predictions and len(predictions) > 0:
                texts.append(predictions[0].text.strip())

        return "\n\n---\n\n".join(texts)
    except Exception as e:
        logger.error(f"Surya OCR failed: {e}")
        return ""


async def parse_with_llm_fallback(text: str) -> GenericDocumentSchema | None:
    """
    Uses Ollama and Instructor to extract structured data from messy text.
    """
    try:
        import litellm
        
        client = instructor.from_litellm(
            litellm.acompletion,
            mode=instructor.Mode.JSON
        )
        
        prompt = (
            "Extract structured information from the following document text. "
            "Ignore boilerplate, advertisements, and disclaimers.\n\n"
            f"Document Text:\n{text[:8000]}" # Truncate to avoid context overflow
        )

        resp = await client.chat.completions.create(
            model=f"ollama/{settings.ollama_model_planner or 'qwen2.5:7b'}",
            messages=[{"role": "user", "content": prompt}],
            response_model=GenericDocumentSchema,
            max_retries=2,
            api_base=OLLAMA_BASE_URL
        )
        return resp
    except Exception as e:
        logger.error(f"LLM fallback extraction failed: {e}")
        return None
