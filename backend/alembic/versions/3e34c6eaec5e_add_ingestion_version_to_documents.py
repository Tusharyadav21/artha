"""add ingestion_version to documents

Revision ID: 3e34c6eaec5e
Revises: 07f642522047
Create Date: 2026-06-22 19:42:11.053733

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3e34c6eaec5e'
down_revision: Union[str, Sequence[str], None] = '07f642522047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ingestion_version column to documents table."""
    op.add_column('documents', sa.Column('ingestion_version', sa.String(length=20), nullable=False))


def downgrade() -> None:
    """Remove ingestion_version column from documents table."""
    op.drop_column('documents', 'ingestion_version')
