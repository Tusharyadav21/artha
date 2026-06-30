"""add_model_id_index_and_conversation_memory_unique

Revision ID: 6000df845707
Revises: 5ec70fa67ca7
Create Date: 2026-06-25 23:46:49.858210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6000df845707'
down_revision: Union[str, Sequence[str], None] = '5ec70fa67ca7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        "uq_conversation_memory_key",
        "conversation_memories",
        ["conversation_id", "key"],
    )
    op.create_index(
        op.f("ix_prompt_templates_model_id"),
        "prompt_templates",
        ["model_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_prompt_templates_model_id"), table_name="prompt_templates"
    )
    op.drop_constraint(
        "uq_conversation_memory_key", "conversation_memories", type_="unique"
    )
