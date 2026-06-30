"""add_user_llm_configs

Revision ID: a1b2c3d4e5f6
Revises: 396d0b3698f9
Create Date: 2026-06-05 13:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '396d0b3698f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TYPE llm_provider_enum AS ENUM (
            'openai', 'anthropic', 'groq', 'gemini',
            'mistral', 'together', 'cohere', 'ollama'
        )
        """
    )

    op.create_table(
        'user_llm_configs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column(
            'provider',
            postgresql.ENUM(
                'openai', 'anthropic', 'groq', 'gemini',
                'mistral', 'together', 'cohere', 'ollama',
                name='llm_provider_enum',
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column('api_key_encrypted', sa.LargeBinary(), nullable=False),
        sa.Column('model', sa.String(120), nullable=True),
        sa.Column('temperature', sa.Float(), nullable=False, server_default='0.7'),
        sa.Column('max_tokens', sa.Integer(), nullable=False, server_default='2048'),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('base_delay_s', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('timeout_s', sa.Integer(), nullable=False, server_default='60'),
        sa.Column(
            'extra_params',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default='{}',
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_llm_configs_user_id'),
    )
    op.create_index('ix_user_llm_configs_user_id', 'user_llm_configs', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_llm_configs_user_id', table_name='user_llm_configs')
    op.drop_table('user_llm_configs')
    op.execute('DROP TYPE llm_provider_enum')
