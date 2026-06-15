"""bge_m3_1024d_and_image_support

Revision ID: 125a9d84b09a
Revises: a1b2c3d4e5f6
Create Date: 2026-06-14 03:57:04.886005

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '125a9d84b09a'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop IVFFlat index before changing vector dimension (pgvector requires this)
    op.drop_index(
        "ix_document_chunks_embedding_cosine",
        table_name="document_chunks",
        if_exists=True,
    )
    op.add_column("document_chunks", sa.Column("image_path", sa.String(length=1024), nullable=True))
    op.add_column("document_chunks", sa.Column("image_caption", sa.Text(), nullable=True))
    op.alter_column(
        "document_chunks",
        "embedding",
        existing_type=pgvector.sqlalchemy.VECTOR(dim=768),
        type_=pgvector.sqlalchemy.VECTOR(dim=1024),
        existing_nullable=False,
        postgresql_using="embedding::vector(1024)",
    )
    # Recreate IVFFlat index for the new 1024-dim vectors
    op.create_index(
        "ix_document_chunks_embedding_cosine",
        "document_chunks",
        ["embedding"],
        postgresql_using="ivfflat",
        postgresql_with={"lists": 100},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.drop_constraint(
        op.f("uq_user_llm_configs_user_id"), "user_llm_configs", type_="unique"
    )
    op.drop_index(op.f("ix_user_llm_configs_user_id"), table_name="user_llm_configs")
    op.create_index(
        op.f("ix_user_llm_configs_user_id"),
        "user_llm_configs",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_user_llm_configs_user_id"), table_name="user_llm_configs")
    op.create_index(
        op.f("ix_user_llm_configs_user_id"),
        "user_llm_configs",
        ["user_id"],
        unique=False,
    )
    op.create_unique_constraint(
        op.f("uq_user_llm_configs_user_id"),
        "user_llm_configs",
        ["user_id"],
        postgresql_nulls_not_distinct=False,
    )
    # Drop IVFFlat index before changing vector dimension back
    op.drop_index(
        "ix_document_chunks_embedding_cosine",
        table_name="document_chunks",
        if_exists=True,
    )
    op.alter_column(
        "document_chunks",
        "embedding",
        existing_type=pgvector.sqlalchemy.VECTOR(dim=1024),
        type_=pgvector.sqlalchemy.VECTOR(dim=768),
        existing_nullable=False,
        postgresql_using="embedding::vector(768)",
    )
    op.create_index(
        "ix_document_chunks_embedding_cosine",
        "document_chunks",
        ["embedding"],
        postgresql_using="ivfflat",
        postgresql_with={"lists": 100},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.drop_column("document_chunks", "image_caption")
    op.drop_column("document_chunks", "image_path")
