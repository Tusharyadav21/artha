"""add user settings

Revision ID: 20260512_0003
Revises: 20260509_0002
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260512_0003"
down_revision: str | None = "20260509_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "theme_preference",
            sa.String(length=16),
            nullable=False,
            server_default="system",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "default_home_tab",
            sa.String(length=16),
            nullable=False,
            server_default="chat",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "sidebar_collapsed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "new_chat_scope_mode",
            sa.String(length=24),
            nullable=False,
            server_default="clear",
        ),
    )
    op.create_check_constraint(
        "ck_users_theme_preference",
        "users",
        "theme_preference IN ('system', 'light', 'dark')",
    )
    op.create_check_constraint(
        "ck_users_default_home_tab",
        "users",
        "default_home_tab IN ('chat', 'library', 'settings')",
    )
    op.create_check_constraint(
        "ck_users_new_chat_scope_mode",
        "users",
        "new_chat_scope_mode IN ('clear', 'remember', 'all-completed')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_new_chat_scope_mode", "users", type_="check")
    op.drop_constraint("ck_users_default_home_tab", "users", type_="check")
    op.drop_constraint("ck_users_theme_preference", "users", type_="check")
    op.drop_column("users", "new_chat_scope_mode")
    op.drop_column("users", "sidebar_collapsed")
    op.drop_column("users", "default_home_tab")
    op.drop_column("users", "theme_preference")
    op.drop_column("users", "display_name")
