"""remove source_bytes

Revision ID: e2df87c9f208
Revises: d45d34557a99
Create Date: 2026-07-02 00:27:09.168753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2df87c9f208'
down_revision: Union[str, Sequence[str], None] = 'd45d34557a99'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS source_bytes;")


def downgrade() -> None:
    """Downgrade schema."""
    pass
