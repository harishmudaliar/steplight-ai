"""Persist source and generation attribution on accepted steps.

Revision ID: b92c5e6f1074
Revises: a7d1e4c90231
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b92c5e6f1074"
down_revision: Union[str, None] = "a7d1e4c90231"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("steps") as batch_op:
        batch_op.add_column(sa.Column("source", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("generation_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_steps_generation_id_step_generations",
            "step_generations",
            ["generation_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("steps") as batch_op:
        batch_op.drop_constraint("fk_steps_generation_id_step_generations", type_="foreignkey")
        batch_op.drop_column("generation_id")
        batch_op.drop_column("source")
