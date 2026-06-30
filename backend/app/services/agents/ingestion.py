import json
import logging

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.services.idp_parser import (
    classify_document,
    fast_extract_text,
    parse_with_coordinates,
    parse_with_llm_fallback,
    run_ocr,
)
from app.services.ingestion import (
    chunk_text_hierarchical,
    embed_chunks_enriched,
    parse_document_bytes,
)
from app.services.llm_client import LiteLLMClient
from app.services.vision import caption_image, is_image_filename, is_image_mime
from app.utils.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

IMAGE_PLACEHOLDER = "[Image document awaiting caption]"


class IngestionState(BaseModel):
    document_id: str = ""
    project_id: str = ""
    source_bytes: bytes = Field(default_factory=bytes)
    mime_type: str | None = None
    filename: str = ""
    embed_model: str | None = None
    text: str | None = None
    metadata: dict | None = None
    chunks: list[tuple[str, str, str | None]] | None = None
    embedded_chunks: list[tuple[str, list[float], dict]] | None = None
    caption: str | None = None


def build_ingestion_graph():
    async def parse_document(state: IngestionState) -> IngestionState:
        logger.debug("Document %s: parsing bytes", state.document_id)
        mime = state.mime_type
        filename = state.filename

        if is_image_mime(mime) or is_image_filename(filename):
            return state.model_copy(update={"text": IMAGE_PLACEHOLDER})

        # 1. IDP Routing for PDFs
        metadata_update = {}
        if state.project_id and mime == "application/pdf":
            first_page_text = await fast_extract_text(state.source_bytes)
            
            import uuid
            async with AsyncSessionLocal() as db:
                tmpl, schema = await classify_document(
                    db, uuid.UUID(state.project_id), first_page_text,
                )
            
            if tmpl and schema:
                logger.info(f"Document {state.document_id} matched template: {tmpl.name}")
                extracted_data = parse_with_coordinates(state.source_bytes, schema)
                text = json.dumps(extracted_data, indent=2)
                metadata_update["schema_id"] = str(tmpl.id)
                return state.model_copy(update={"text": text, "metadata": metadata_update})

        # 2. Generic Digital Extraction
        try:
            text = parse_document_bytes(state.source_bytes, mime, filename)
        except ValueError:
            text = ""

        # 3. Gibberish Validation & OCR Fallback
        alpha_count = sum(c.isalnum() for c in text)
        total_count = len(text.strip())
        
        # Trigger fallback if empty or if less than 50% alphanumeric (likely corrupted font/scanned)
        if total_count == 0 or (total_count > 50 and alpha_count / total_count < 0.5):
            logger.warning(
                "Document %s: Text extraction empty or gibberish. Falling back to OCR.",
                state.document_id,
            )
            text = await run_ocr(state.source_bytes)
            
            structured = await parse_with_llm_fallback(text)
            if structured:
                text = structured.model_dump_json(indent=2)
                metadata_update["fallback_schema_used"] = True

        return state.model_copy(update={"text": text, "metadata": metadata_update})

    async def caption_images(state: IngestionState) -> IngestionState:
        mime = state.mime_type
        filename = state.filename

        if not (is_image_mime(mime) or is_image_filename(filename)):
            return state.model_copy(update={"caption": None})

        logger.debug("Document %s: generating image caption", state.document_id)
        caption = await caption_image(state.source_bytes, mime)
        if caption:
            return state.model_copy(update={"text": caption, "caption": caption})
        return state.model_copy(update={"caption": None})

    async def extract_metadata(state: IngestionState) -> IngestionState:
        logger.debug("Document %s: extracting metadata", state.document_id)
        text = state.text or ""
        metadata = state.metadata or {}
        
        # If we already got structured JSON from our IDP pipeline, skip LLM extraction
        if "schema_id" in metadata or "fallback_schema_used" in metadata:
            return state

        if not text or text == IMAGE_PLACEHOLDER:
            return state.model_copy(update={"metadata": metadata})

        # 1. Try deterministic file metadata first (PDF native metadata from fitz)
        deterministic_meta = {}
        mime = state.mime_type
        if mime == "application/pdf" and state.source_bytes:
            try:
                import fitz
                doc = fitz.open(stream=state.source_bytes, filetype="pdf")
                pdf_meta = doc.metadata
                doc.close()
                deterministic_meta = {
                    "title": pdf_meta.get("title") or None,
                    "author": pdf_meta.get("author") or None,
                }
            except Exception as e:
                logger.warning(
                    "Document %s: failed to extract PDF metadata: %s",
                    state.document_id, e,
                )

        # 2. LLM fallback only for fields not covered by deterministic extraction
        try:
            llm_fields = {}
            has_title = bool(deterministic_meta.get("title"))
            has_author = bool(deterministic_meta.get("author"))
            missing_deterministic = not has_title or not has_author
            if missing_deterministic:
                llm = LiteLLMClient()
                metadata_prompt = (
                    "Extract the following metadata from the text below: "
                    "title, author, summary, and keywords. "
                    "Return ONLY a valid JSON object with these keys. "
                    "If a value is unknown, use null.\n\n"
                    f"Text (first 2000 chars):\n{text[:2000]}"
                )
                metadata_json_str = await llm.generate(metadata_prompt, format="json")
                if metadata_json_str:
                    llm_fields = json.loads(metadata_json_str)
        except Exception as e:
            logger.warning("Document %s: failed LLM metadata extraction: %s", state.document_id, e)

        # Merge: deterministic values take priority, LLM fills gaps and adds summary/keywords
        metadata = {
            "title": deterministic_meta.get("title") or llm_fields.get("title"),
            "author": deterministic_meta.get("author") or llm_fields.get("author"),
            "summary": llm_fields.get("summary"),
            "keywords": llm_fields.get("keywords"),
        }
        # Filter out None values
        metadata = {k: v for k, v in metadata.items() if v is not None}

        return state.model_copy(update={"metadata": metadata})

    async def chunk_document(state: IngestionState) -> IngestionState:
        logger.debug("Document %s: chunking text", state.document_id)
        text = state.text or ""
        chunks = chunk_text_hierarchical(text, filename=state.filename)
        return state.model_copy(update={"chunks": chunks})

    async def embed_chunks(state: IngestionState) -> IngestionState:
        logger.debug("Document %s: embedding chunks", state.document_id)
        chunks = state.chunks or []
        embedded_chunks = await embed_chunks_enriched(
            chunks,
            embed_model=state.embed_model,
            image_caption=state.caption,
        )
        return state.model_copy(update={"embedded_chunks": embedded_chunks})

    graph = StateGraph(IngestionState)

    graph.add_node("parse_document", parse_document)
    graph.add_node("caption_images", caption_images)
    graph.add_node("extract_metadata", extract_metadata)
    graph.add_node("chunk_document", chunk_document)
    graph.add_node("embed_chunks", embed_chunks)

    graph.set_entry_point("parse_document")
    graph.add_edge("parse_document", "caption_images")
    graph.add_edge("caption_images", "extract_metadata")
    graph.add_edge("extract_metadata", "chunk_document")
    graph.add_edge("chunk_document", "embed_chunks")
    graph.add_edge("embed_chunks", END)

    return graph.compile()
