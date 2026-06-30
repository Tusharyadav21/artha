import json
import logging

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from src.services.ingestion import (
    chunk_text_hierarchical,
    embed_chunks_enriched,
    parse_document_bytes,
)
from src.services.ollama import get_ollama_client
from src.services.vision import caption_image, is_image_filename, is_image_mime

logger = logging.getLogger(__name__)

IMAGE_PLACEHOLDER = "[Image document awaiting caption]"


class IngestionState(BaseModel):
    document_id: str = ""
    source_bytes: bytes = Field(default_factory=bytes)
    mime_type: str | None = None
    filename: str = ""
    embed_model: str | None = None
    text: str | None = None
    metadata: dict | None = None
    chunks: list[tuple[str, str]] | None = None
    embedded_chunks: list[tuple[str, list[float], dict]] | None = None
    caption: str | None = None


def build_ingestion_graph():
    async def parse_document(state: IngestionState) -> IngestionState:
        logger.debug("Document %s: parsing bytes", state.document_id)
        mime = state.mime_type
        filename = state.filename

        if is_image_mime(mime) or is_image_filename(filename):
            return state.model_copy(update={"text": IMAGE_PLACEHOLDER})

        text = parse_document_bytes(state.source_bytes, mime, filename)
        return state.model_copy(update={"text": text})

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
        if not text or text == IMAGE_PLACEHOLDER:
            return state.model_copy(update={"metadata": {}})

        try:
            ollama = await get_ollama_client()
            metadata_prompt = (
                "Extract the following metadata from the text below: "
                "title, author, summary, and keywords. "
                "Return ONLY a valid JSON object with these keys. "
                "If a value is unknown, use null.\n\n"
                f"Text (first 2000 chars):\n{text[:2000]}"
            )
            metadata_json_str = await ollama.generate(metadata_prompt, format="json")
            if metadata_json_str:
                metadata = json.loads(metadata_json_str)
                return state.model_copy(update={"metadata": metadata})
        except Exception as e:
            logger.warning("Document %s: failed to extract metadata: %s", state.document_id, e)

        return state.model_copy(update={"metadata": {}})

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
