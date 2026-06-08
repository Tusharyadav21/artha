from io import BytesIO
from zipfile import ZipFile
from unittest.mock import AsyncMock, patch

import pytest

from src.services.ingestion import (
    chunk_text,
    parse_document_bytes,
    sha256_bytes,
    chunk_text_hierarchical,
    embed_chunks_enriched,
)


def test_parse_text_document() -> None:
    text = parse_document_bytes(b"hello\nworld", "text/plain", "note.txt")

    assert text == "hello\nworld"


def test_parse_docx_document() -> None:
    content = BytesIO()
    with ZipFile(content, "w") as archive:
        archive.writestr(
            "word/document.xml",
            """
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:body>
                <w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t> DOCX</w:t></w:r></w:p>
                <w:p><w:r><w:t>Second line</w:t></w:r></w:p>
              </w:body>
            </w:document>
            """,
        )

    text = parse_document_bytes(
        content.getvalue(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "note.docx",
    )

    assert text == "Hello DOCX\nSecond line"


def test_parse_unsupported_document() -> None:
    with pytest.raises(ValueError, match="Unsupported document type"):
        parse_document_bytes(b"binary", "application/octet-stream", "blob.bin")


def test_chunk_text_overlaps() -> None:
    chunks = chunk_text(
        " ".join(str(number) for number in range(20)),
        chunk_words=8,
        overlap_words=2,
    )

    assert chunks[0] == "0 1 2 3 4 5 6 7"
    assert chunks[1].startswith("6 7")


def test_sha256_bytes_is_stable() -> None:
    assert sha256_bytes(b"rag") == sha256_bytes(b"rag")


def test_chunk_text_hierarchical_csv() -> None:
    csv_text = "id,name,role\n1,Alice,User\n2,Bob,Admin\n3,Charlie,Staff"
    chunks = chunk_text_hierarchical(csv_text, filename="users.csv")
    assert len(chunks) == 1
    child, parent = chunks[0]
    assert "Column Headers: id,name,role" in child
    assert "1,Alice,User" in child
    assert "2,Bob,Admin" in child
    assert "Column Headers: id,name,role" in parent


def test_chunk_text_hierarchical_markdown() -> None:
    md_text = "# Project\n## Setup\nThis is configuration content."
    chunks = chunk_text_hierarchical(md_text, filename="docs.md", child_words=20)
    assert len(chunks) == 1
    child, parent = chunks[0]
    assert "[Context: Project > Setup]" in child
    assert "This is configuration content." in child
    assert "# Project > Setup" in parent


@pytest.mark.asyncio
@patch("src.services.ingestion.OllamaClient")
async def test_embed_chunks_enriched(mock_ollama_class) -> None:
    mock_ollama = AsyncMock()
    mock_ollama.generate.return_value = '{"questions": ["What is this?", "Who is this?"], "summary": "A test chunk."}'
    mock_ollama.embed.return_value = [0.1] * 768
    mock_ollama_class.return_value = mock_ollama

    chunks = [("Child text content", "Parent text content")]
    result = await embed_chunks_enriched(chunks, embed_model="mock-model")

    assert len(result) == 1
    child, embedding, metadata = result[0]
    assert child == "Child text content"
    assert len(embedding) == 768
    assert metadata["summary"] == "A test chunk."
    assert metadata["hypothetical_questions"] == ["What is this?", "Who is this?"]

    mock_ollama.embed.assert_called_once()
    call_args = mock_ollama.embed.call_args[0][0]
    assert "Questions: What is this? Who is this?" in call_args
    assert "Summary: A test chunk." in call_args
    assert "Content: Child text content" in call_args
