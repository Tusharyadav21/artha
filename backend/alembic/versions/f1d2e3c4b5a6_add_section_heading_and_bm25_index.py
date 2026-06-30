"""add_section_heading_and_bm25_index

Revision ID: f1d2e3c4b5a6
Revises: 3e34c6eaec5e
Create Date: 2026-06-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1d2e3c4b5a6"
down_revision: Union[str, Sequence[str], None] = "3e34c6eaec5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add section_heading column for structured heading tracking
    op.add_column(
        "document_chunks",
        sa.Column("section_heading", sa.Text(), nullable=True),
    )

    # BM25 full-text search index for the keyword leg of RRF fusion
    # Uses ParadeDB's pg_bm25 extension (already installed via init-db.sql)
    op.execute(
        sa.text("""
            CREATE INDEX IF NOT EXISTS idx_chunks_bm25
            ON document_chunks
            USING bm25 (id, content)
            WITH (key_field = 'id');
        """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_chunks_bm25", table_name="document_chunks", if_exists=True)
    op.drop_column("document_chunks", "section_heading")
