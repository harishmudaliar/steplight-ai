"""Add optimistic versions to tasks and steps.

Revision ID: c39f16a02bd7
Revises: b92c5e6f1074
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c39f16a02bd7"
down_revision: Union[str, None] = "b92c5e6f1074"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(
            sa.Column("version", sa.Integer(), server_default="1", nullable=False)
        )
    with op.batch_alter_table("steps") as batch_op:
        batch_op.add_column(
            sa.Column("version", sa.Integer(), server_default="1", nullable=False)
        )


def downgrade() -> None:
    with op.batch_alter_table("steps") as batch_op:
        batch_op.drop_column("version")
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_column("version")
