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


async def embed_chunks(chunks: list[str]) -> list[tuple[str, list[float], dict]]:
    ollama = OllamaClient()
    embedded: list[tuple[str, list[float], dict]] = []
    for index, chunk in enumerate(chunks):
        embedding = await ollama.embed(chunk)
        embedded.append((chunk, embedding, {"chunk_index": index}))
    return embedded
