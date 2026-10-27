"""Use active as the canonical task status.

Revision ID: 8d3b7a2f4c19
Revises: 6f1ae3c85bcd
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8d3b7a2f4c19"
down_revision: Union[str, None] = "6f1ae3c85bcd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE tasks SET status = 'active' WHERE status = 'in_progress'"))


def downgrade() -> None:
    op.execute(sa.text("UPDATE tasks SET status = 'in_progress' WHERE status = 'active'"))
