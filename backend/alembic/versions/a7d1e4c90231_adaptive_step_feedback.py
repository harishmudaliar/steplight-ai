"""Persist idempotent adaptive step feedback transitions.

Revision ID: a7d1e4c90231
Revises: c4a91e7d2b60
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7d1e4c90231"
down_revision: Union[str, None] = "c4a91e7d2b60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "step_feedback_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("step_id", sa.String(length=36), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["step_id"], ["steps.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_step_feedback_user_idempotency"),
    )
    op.create_index(
        "ix_step_feedback_user_task_created",
        "step_feedback_events",
        ["user_id", "task_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_step_feedback_user_task_created", table_name="step_feedback_events")
    op.drop_table("step_feedback_events")
