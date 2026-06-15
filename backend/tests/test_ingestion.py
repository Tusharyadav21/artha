from io import BytesIO
from unittest.mock import AsyncMock, patch
from zipfile import ZipFile

import pytest

from src.services.ingestion import (
    chunk_text_hierarchical,
    embed_chunks_enriched,
    parse_document_bytes,
    sha256_bytes,
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

    assert "Hello" in text
    assert "DOCX" in text
    assert "Second line" in text


def test_parse_unsupported_document() -> None:
    with pytest.raises(ValueError, match="Error parsing document with MarkItDown.*"):
        parse_document_bytes(b"", "application/octet-stream", "blob.bin")


def test_parse_empty_text_raises_error() -> None:
    with pytest.raises(ValueError, match="Document did not contain extractable text"):
        parse_document_bytes(b"   \n\n   ", "text/plain", "empty.txt")


def test_chunk_text_hierarchical_empty_string() -> None:
    chunks = chunk_text_hierarchical("", filename="test.txt")
    assert chunks == []


def test_chunk_text_hierarchical_no_filename_uses_default_chunking() -> None:
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = chunk_text_hierarchical(text, child_words=5, parent_words=20)
    assert len(chunks) >= 1
    child, _ = chunks[0]
    assert "First paragraph" in child


def test_chunk_text_hierarchical_csv_large() -> None:
    rows = "\n".join([f"{i},name{i},role{i}" for i in range(50)])
    csv_text = f"id,name,role\n{rows}"
    chunks = chunk_text_hierarchical(csv_text, filename="users.csv")
    assert len(chunks) > 1
    for child, _parent in chunks:
        assert "Column Headers: id,name,role" in child


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
    return_val = '{"questions": ["What is this?", "Who is this?"], "summary": "A test chunk."}'
    mock_ollama.generate.return_value = return_val
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


@pytest.mark.asyncio
@patch("src.services.ingestion.OllamaClient")
async def test_embed_chunks_enriched_recovers_from_generation_failure(mock_ollama_class) -> None:
    mock_ollama = AsyncMock()
    mock_ollama.generate.side_effect = RuntimeError("Ollama down")
    mock_ollama.embed.return_value = [0.2] * 768
    mock_ollama_class.return_value = mock_ollama

    chunks = [("Fallback chunk", "Parent")]
    result = await embed_chunks_enriched(chunks, embed_model="mock-model")

    assert len(result) == 1
    child, embedding, metadata = result[0]
    assert child == "Fallback chunk"
    assert metadata["hypothetical_questions"] == []
    assert metadata["summary"] == ""

    mock_ollama.embed.assert_called_once()
    call_args = mock_ollama.embed.call_args[0][0]
    assert "Questions: " in call_args
    assert "Content: Fallback chunk" in call_args


@pytest.mark.asyncio
@patch("src.services.ingestion.OllamaClient")
async def test_embed_chunks_enriched_recovers_from_embedding_failure(mock_ollama_class) -> None:
    mock_ollama = AsyncMock()
    mock_ollama.generate.return_value = '{"questions": ["Q1"], "summary": "Sum"}'
    mock_ollama.embed.side_effect = [RuntimeError("Ollama timeout"), [0.3] * 768]
    mock_ollama_class.return_value = mock_ollama

    chunks = [("Child text", "Parent text")]
    result = await embed_chunks_enriched(chunks, embed_model="mock-model")

    assert len(result) == 1
    assert mock_ollama.embed.call_count == 2
