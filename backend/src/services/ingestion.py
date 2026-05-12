import hashlib
from io import BytesIO
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from pypdf import PdfReader

from src.services.ollama import OllamaClient

SUPPORTED_TEXT_MIME_PREFIXES = ("text/",)
SUPPORTED_TEXT_MIME_TYPES = {
    "application/json",
    "application/markdown",
    "application/x-ndjson",
    "text/markdown",
    "text/csv",
}
DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def parse_docx_bytes(content: bytes) -> str:
    try:
        with ZipFile(BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except (BadZipFile, KeyError) as exc:
        raise ValueError("Could not read DOCX document text") from exc

    root = ElementTree.fromstring(document_xml)
    paragraphs: list[str] = []
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    for paragraph in root.findall(".//w:p", namespace):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", namespace)).strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def parse_document_bytes(content: bytes, mime_type: str | None, filename: str) -> str:
    normalized_mime = (mime_type or "").lower()
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if normalized_mime == "application/pdf" or suffix == "pdf":
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n\n".join(page.strip() for page in pages if page.strip())
    elif normalized_mime == DOCX_MIME_TYPE or suffix == "docx":
        text = parse_docx_bytes(content)
    elif (
        normalized_mime.startswith(SUPPORTED_TEXT_MIME_PREFIXES)
        or normalized_mime in SUPPORTED_TEXT_MIME_TYPES
    ):
        text = content.decode("utf-8", errors="replace")
    elif suffix in {"txt", "md", "markdown", "csv", "json"}:
        text = content.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported document type: {mime_type or suffix or 'unknown'}")

    text = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not text:
        raise ValueError("Document did not contain extractable text")
    return text


def chunk_text(text: str, chunk_words: int = 260, overlap_words: int = 40) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    step = max(chunk_words - overlap_words, 1)
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_words]).strip()
        if chunk:
            chunks.append(chunk)
        if start + chunk_words >= len(words):
            break
    return chunks


def chunk_text_hierarchical(
    text: str,
    child_words: int = 60,
    parent_words: int = 300,
    child_overlap: int = 10,
    parent_overlap: int = 50,
) -> list[tuple[str, str]]:
    """
    Returns (child_chunk, parent_chunk) pairs.
    Child chunks (~60 words) are embedded for precise vector retrieval.
    Parent chunks (~300 words) are stored in metadata and expanded at query time for richer context.
    """
    words = text.split()
    if not words:
        return []

    parent_step = max(parent_words - parent_overlap, 1)
    child_step = max(child_words - child_overlap, 1)
    result: list[tuple[str, str]] = []
    seen_children: set[str] = set()

    for p_start in range(0, len(words), parent_step):
        p_end = min(p_start + parent_words, len(words))
        parent_text = " ".join(words[p_start:p_end]).strip()
        if not parent_text:
            break

        parent_slice = words[p_start:p_end]
        for c_start in range(0, len(parent_slice), child_step):
            c_end = min(c_start + child_words, len(parent_slice))
            child_text = " ".join(parent_slice[c_start:c_end]).strip()
            if child_text and child_text not in seen_children:
                seen_children.add(child_text)
                result.append((child_text, parent_text))
            if c_end >= len(parent_slice):
                break

        if p_end >= len(words):
            break

    return result


async def embed_chunks(chunks: list[tuple[str, str]]) -> list[tuple[str, list[float], dict]]:
    """
    chunks: list of (child_content, parent_content) from chunk_text_hierarchical.
    Embeds the child content; stores parent_content in metadata for context expansion at query time.
    """
    ollama = OllamaClient()
    embedded: list[tuple[str, list[float], dict]] = []
    for index, (child, parent) in enumerate(chunks):
        embedding = await ollama.embed(child)
        embedded.append((child, embedding, {"chunk_index": index, "parent_content": parent}))
    return embedded
