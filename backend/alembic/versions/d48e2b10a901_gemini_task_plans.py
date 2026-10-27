"""Persist Gemini plans without replacing legacy tasks or completed steps."""
from alembic import op
import sqlalchemy as sa

revision = "d48e2b10a901"
down_revision = "c39f16a02bd7"
branch_labels = None
depends_on = None


def upgrade():
    for name, kind in [("original_input", sa.Text()), ("plan_goal", sa.Text()),
                       ("description", sa.Text()), ("plan_model", sa.String(100))]:
        op.add_column("tasks", sa.Column(name, kind, nullable=True))
    op.add_column("tasks", sa.Column("plan_guidance", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE tasks SET original_input = title, plan_goal = title")
    for name, kind in [("instruction", sa.Text()), ("effort", sa.String(20)), ("research_suggestions", sa.JSON())]:
        op.add_column("steps", sa.Column(name, kind, nullable=True))


def downgrade():
    for name in ("research_suggestions", "effort", "instruction"):
        op.drop_column("steps", name)
    for name in ("plan_guidance", "plan_model", "description", "plan_goal", "original_input"):
        op.drop_column("tasks", name)
