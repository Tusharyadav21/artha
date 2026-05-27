import hashlib
import re
from io import BytesIO
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from pypdf import PdfReader

from src.services.ollama import OllamaClient

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'\(])")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n+")

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
    """
    Purpose:
        Extract plain text from a DOCX file's XML structure.

    Responsibilities:
        - Parse the ZIP archive containing DOCX XML.
        - Extract text from all word processing paragraphs.

    Inputs:
        content (bytes): Raw binary content of the DOCX file.

    Outputs:
        str: Extracted text joined by newlines.

    Exceptions:
        ValueError: Raised if the ZIP archive is corrupt or missing document.xml.

    Execution flow:
        1. Open bytes as ZipFile.
        2. Read 'word/document.xml'.
        3. Use ElementTree to find all <w:p> tags.
        4. Join all <w:t> text nodes within each paragraph.
        5. Return joined paragraphs.
    """
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
    """
    Purpose:
        Generate a SHA256 hash of raw bytes for document deduplication.

    Inputs:
        content (bytes): Raw binary data.

    Outputs:
        str: Hexadecimal representation of the hash.
    """
    return hashlib.sha256(content).hexdigest()


def parse_document_bytes(content: bytes, mime_type: str | None, filename: str) -> str:
    """
    Purpose:
        Route raw file bytes to the appropriate parser based on MIME type or extension.

    Responsibilities:
        - Handle PDF, DOCX, and various text-based formats.
        - Normalize whitespace and ensure non-empty output.

    Inputs:
        content (bytes): Raw binary file content.
        mime_type (str | None): The declared MIME type.
        filename (str): Name of the file for extension-based fallback.

    Outputs:
        str: Extracted plain text.

    Exceptions:
        ValueError: Raised for unsupported types or documents with no extractable text.

    Execution flow:
        1. Normalize MIME type and extract file suffix.
        2. If PDF: Use PdfReader to extract text from pages.
        3. If DOCX: Call parse_docx_bytes.
        4. If text-like: Decode as UTF-8 with replacement.
        5. Clean whitespace and verify non-empty result.
    """
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
    """
    Purpose:
        Perform a simple sliding-window split of text into word-based chunks.

    Inputs:
        text (str): Input text to split.
        chunk_words (int): Target word count per chunk.
        overlap_words (int): Word overlap between adjacent chunks.

    Outputs:
        list[str]: List of text chunks.

    Execution flow:
        1. Split text into word list.
        2. Calculate step size (chunk_words - overlap_words).
        3. Iterate and slice word list, joining slices back into strings.
    """
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


def _split_sentences(text: str) -> list[str]:
    """
    Purpose:
        Split text into individual sentences using a regex boundary.

    Inputs:
        text (str): Text to split.

    Outputs:
        list[str]: List of trimmed non-empty sentences.
    """
    sentences: list[str] = []
    for sent in _SENTENCE_SPLIT.split(text):
        s = sent.strip()
        if s:
            sentences.append(s)
    return sentences


def _pack_units(units: list[str], target_words: int) -> list[str]:
    """
    Purpose:
        Greedily pack ordered text units into chunks up to target_words.

    Responsibilities:
        - Combine units while respecting the word limit.
        - Avoid splitting a single unit if it already exceeds the limit.

    Inputs:
        units (list[str]): Ordered list of text units (e.g., paragraphs or sentences).
        target_words (int): Maximum words per packed chunk.

    Outputs:
        list[str]: List of packed chunks.

    Execution flow:
        1. Iterate through units.
        2. Accumulate units in buffer until adding the next unit exceeds target_words.
        3. Emit buffer as a chunk, then reset.
        4. Handle remaining buffer after loop.
    """
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


def chunk_text_hierarchical(
    text: str,
    child_words: int = 80,
    parent_words: int = 320,
) -> list[tuple[str, str]]:
    """
    Purpose:
        Implement semantic hierarchical chunking for improved RAG retrieval.

    Responsibilities:
        - Split text into parent chunks based on paragraphs.
        - Split each parent into child chunks based on sentences.
        - Create mappings of (child_chunk, parent_chunk) for context expansion.

    Inputs:
        text (str): Input text to chunk.
        child_words (int): Target size for child chunks.
        parent_words (int): Target size for parent chunks.

    Outputs:
        list[tuple[str, str]]: Pairs of (child_content, parent_content).

    Execution flow:
        1. Split text into paragraphs.
        2. Pack paragraphs into parent chunks via _pack_units.
        3. For each parent:
           a. Split into sentences.
           b. Pack sentences into child chunks via _pack_units.
           c. Map each unique child back to its parent.
        4. Return result list.
    """
    text = text.strip()
    if not text:
        return []

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
    """
    Purpose:
        Generate embeddings for child chunks using the Ollama client.

    Responsibilities:
        - Iterate through hierarchical chunks.
        - Embed the child text.
        - Package child text, embedding, and parent context for storage.

    Inputs:
        chunks (list[tuple[str, str]]): Pairs of (child, parent).
        embed_model (str | None): Optional model override.

    Outputs:
        list[tuple[str, list[float], dict]]: List of (child, embedding, metadata) tuples.

    Execution flow:
        1. Instantiate OllamaClient.
        2. For each (child, parent) pair:
           a. Call ollama.embed(child).
           b. Create metadata containing chunk index and parent content.
           c. Append to results.
        3. Return result list.
    """
    ollama = OllamaClient()
    embedded: list[tuple[str, list[float], dict]] = []
    for index, (child, parent) in enumerate(chunks):
        embedding = await ollama.embed(child, model_name=embed_model)
        embedded.append((child, embedding, {"chunk_index": index, "parent_content": parent}))
    return embedded
