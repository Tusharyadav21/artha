import asyncio
import hashlib
import json
import re
from io import BytesIO
from logging import getLogger

from markitdown import MarkItDown

from src.core.config import get_settings
from src.services.ollama import get_ollama_client

logger = getLogger(__name__)

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'\(])")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n+")

ROW_GROUP_SIZE = 15


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def parse_document_bytes(content: bytes, mime_type: str | None, filename: str) -> str:
    md = MarkItDown()
    stream = BytesIO(content)
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    extension = f".{suffix}" if suffix else None

    try:
        result = md.convert_stream(stream, file_extension=extension)
        text = result.text_content
    except MemoryError:
        logger.exception("OOM while parsing %s", filename)
        raise ValueError("Document too large to process") from None
    except Exception as e:
        logger.exception("MarkItDown parsing failed for %s", filename)
        raise ValueError(f"Error parsing document with MarkItDown: {e}") from e

    if text is None:
        text = ""

    text = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not text:
        raise ValueError("Document did not contain extractable text")
    return text


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def _pack_units(units: list[str], target_words: int) -> list[str]:
    packed: list[str] = []
    buffer: list[str] = []
    buffer_words = 0
    for unit in units:
        unit_words = len(unit.split())
        if buffer and buffer_words + unit_words > target_words:
            packed.append(" ".join(buffer))
            buffer = []
            buffer_words = 0
        buffer.append(unit)
        buffer_words += unit_words
    if buffer:
        packed.append(" ".join(buffer))
    return packed


def chunk_markdown(text: str, child_words: int = 80) -> list[tuple[str, str]]:
    lines = text.split("\n")
    sections = []
    current_headings = []
    current_section_lines = []

    for line in lines:
        stripped = line.strip()
        header_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if header_match:
            if current_section_lines:
                heading_path = " > ".join(h[1] for h in current_headings)
                sections.append({
                    "heading_path": heading_path,
                    "content": "\n".join(current_section_lines),
                })
                current_section_lines = []

            level = len(header_match.group(1))
            title = header_match.group(2).strip()

            while current_headings and current_headings[-1][0] >= level:
                current_headings.pop()
            current_headings.append((level, title))
        else:
            current_section_lines.append(line)

    if current_section_lines:
        heading_path = " > ".join(h[1] for h in current_headings)
        sections.append({
            "heading_path": heading_path,
            "content": "\n".join(current_section_lines),
        })

    result = []
    for sec in sections:
        content_text = sec["content"].strip()
        if not content_text:
            continue
        sentences = _split_sentences(content_text)
        children = _pack_units(sentences, child_words)

        prefix = f"[Context: {sec['heading_path']}]\n" if sec["heading_path"] else ""
        for child in children:
            if child.strip():
                child_with_context = prefix + child
                heading_text = f"# {sec['heading_path']}\n{content_text}"
                parent_content = heading_text if sec["heading_path"] else content_text
                result.append((child_with_context, parent_content))

    return result


def chunk_text_hierarchical(
    text: str,
    child_words: int | None = None,
    parent_words: int | None = None,
    filename: str = "",
) -> list[tuple[str, str]]:
    settings = get_settings()
    child_words = child_words or settings.chunk_child_words
    parent_words = parent_words or settings.chunk_parent_words

    text = text.strip()
    if not text:
        return []

    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    # 1. Spreadsheet Chunking (Excel / CSV)
    if suffix in {"xlsx", "csv"}:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if len(lines) <= 1:
            return [(text, text)]

        header = lines[0]
        data_rows = lines[1:]

        chunk_size = ROW_GROUP_SIZE
        result = []
        for i in range(0, len(data_rows), chunk_size):
            row_group = data_rows[i : i + chunk_size]
            child_text = f"Column Headers: {header}\nRows:\n" + "\n".join(row_group)

            start = max(0, i - chunk_size)
            end = min(len(data_rows), i + 2 * chunk_size)
            parent_group = data_rows[start:end]
            parent_text = f"Column Headers: {header}\nRows context:\n" + "\n".join(parent_group)

            result.append((child_text, parent_text))
        return result

    # 2. Markdown Chunking
    if suffix in {"md", "markdown"}:
        return chunk_markdown(text, child_words)

    # 3. Default Hierarchical Chunking (PDF, Docx, OCR, plain text)
    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(text) if p.strip()]
    if not paragraphs:
        paragraphs = [text]

    parents = _pack_units(paragraphs, parent_words)

    result: list[tuple[str, str]] = []
    seen_children: set[str] = set()
    for parent_text in parents:
        sentences = _split_sentences(parent_text)
        if not sentences:
            continue
        children = _pack_units(sentences, child_words)
        for child in children:
            if child and child not in seen_children:
                seen_children.add(child)
                result.append((child, parent_text))

    return result


async def embed_chunks(
    chunks: list[tuple[str, str]],
    embed_model: str | None = None,
) -> list[tuple[str, list[float], dict]]:
    ollama = await get_ollama_client()
    embedded: list[tuple[str, list[float], dict]] = []
    for index, (child, parent) in enumerate(chunks):
        embedding = await ollama.embed(child, model_name=embed_model)
        embedded.append((child, embedding, {"chunk_index": index, "parent_content": parent}))
    return embedded


async def embed_chunks_enriched(
    chunks: list[tuple[str, str]],
    embed_model: str | None = None,
    image_caption: str | None = None,
) -> list[tuple[str, list[float], dict]]:
    settings = get_settings()
    semaphore = asyncio.Semaphore(settings.ingestion_semaphore_limit)
    enrichment_timeout = settings.ingestion_enrichment_timeout
    max_chunk_chars = settings.ingestion_max_chunk_tokens * 4
    ollama = await get_ollama_client()
    embedded: list[tuple[str, list[float], dict]] = []

    async def process_single_chunk(index: int, child: str, parent: str):
        child = child[:max_chunk_chars]

        async with semaphore:
            enrichment_prompt = (
                "Analyze the text chunk and write 3 short hypothetical questions "
                "that this text directly answers, and a 1-sentence summary. "
                "Return ONLY a JSON object with keys 'questions' (list of strings) "
                "and 'summary' (string).\n\n"
                f"Chunk:\n{child}"
            )

            questions_list = []
            summary = ""
            try:
                res = await asyncio.wait_for(
                    ollama.generate(enrichment_prompt, format="json"),
                    timeout=enrichment_timeout,
                )
                data = json.loads(res)
                questions_list = data.get("questions") or []
                summary = data.get("summary") or ""
            except TimeoutError:
                logger.warning("Enrichment timed out for chunk %d", index)
            except Exception as e:
                logger.warning("Enrichment generation failed for chunk %d: %s", index, e)

            questions_str = " ".join(questions_list)

            enriched_search_text = (
                f"Questions: {questions_str}\n"
                f"Summary: {summary}\n"
                f"Content: {child}"
            )

            try:
                embedding = await asyncio.wait_for(
                    ollama.embed(enriched_search_text, model_name=embed_model),
                    timeout=enrichment_timeout,
                )
            except Exception as e:
                logger.error("Embedding generation failed for chunk %d: %s", index, e)
                embedding = await asyncio.wait_for(
                    ollama.embed(child, model_name=embed_model),
                    timeout=enrichment_timeout,
                )

            metadata = {
                "chunk_index": index,
                "parent_content": parent,
                "hypothetical_questions": questions_list,
                "summary": summary,
            }
            if image_caption:
                metadata["image_caption"] = image_caption
                metadata["image_path"] = f"chunk:{index}"
            return child, embedding, metadata

    tasks = [process_single_chunk(i, child, parent) for i, (child, parent) in enumerate(chunks)]
    results = await asyncio.gather(*tasks)

    for res in results:
        if res:
            embedded.append(res)

    return embedded
