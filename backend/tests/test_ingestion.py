from io import BytesIO
from zipfile import ZipFile

import pytest

from src.services.ingestion import chunk_text, parse_document_bytes, sha256_bytes


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
