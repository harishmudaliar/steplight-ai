"""Add opt-in and metadata-only AI generation records.

Revision ID: c4a91e7d2b60
Revises: 8d3b7a2f4c19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a91e7d2b60"
down_revision: Union[str, None] = "8d3b7a2f4c19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column(
            "gemini_personalization_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_table(
        "step_generations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("strategy_id", sa.String(length=100), nullable=True),
        sa.Column("guard_version", sa.String(length=30), nullable=False),
        sa.Column("guard_passed", sa.Boolean(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("estimated_cost_usd", sa.String(length=32), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_step_generations_task_id", "step_generations", ["task_id"])


def downgrade() -> None:
    op.drop_index("ix_step_generations_task_id", table_name="step_generations")
    op.drop_table("step_generations")
    op.drop_column("user_preferences", "gemini_personalization_enabled")
