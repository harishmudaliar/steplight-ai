"""Add personalized goals and scheduling metadata while preserving tasks."""
from alembic import op
import sqlalchemy as sa

revision = "f82a4b19c6d1"
down_revision = "d48e2b10a901"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "goals" not in inspector.get_table_names():
        op.create_table(
        "goals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column("skill_level", sa.String(30), nullable=False),
        sa.Column("minutes_per_day", sa.Integer(), nullable=False),
        sa.Column("working_days", sa.JSON(), nullable=False),
        sa.Column("capacity", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("constraints", sa.Text()),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if "ix_goals_user_id" not in {i["name"] for i in sa.inspect(bind).get_indexes("goals")}:
        op.create_index("ix_goals_user_id", "goals", ["user_id"])
    if "goal_schedule_revisions" not in sa.inspect(bind).get_table_names():
        op.create_table(
        "goal_schedule_revisions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("goal_id", sa.String(36), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("changes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
    if "ix_goal_schedule_revisions_goal_id" not in {i["name"] for i in sa.inspect(bind).get_indexes("goal_schedule_revisions")}:
        op.create_index("ix_goal_schedule_revisions_goal_id", "goal_schedule_revisions", ["goal_id"])
    columns = {c["name"] for c in sa.inspect(bind).get_columns("tasks")}
    with op.batch_alter_table("tasks") as batch:
        if "goal_id" not in columns:
            batch.add_column(sa.Column("goal_id", sa.String(36)))
            batch.create_foreign_key("fk_tasks_goal_id_goals", "goals", ["goal_id"], ["id"], ondelete="SET NULL")
        for name, column in [
            ("milestone", sa.Column("milestone", sa.String(255))),
            ("scheduled_date", sa.Column("scheduled_date", sa.Date())),
            ("deadline", sa.Column("deadline", sa.Date())),
            ("duration_minutes", sa.Column("duration_minutes", sa.Integer())),
            ("priority", sa.Column("priority", sa.Integer(), nullable=False, server_default="3")),
            ("dependencies", sa.Column("dependencies", sa.JSON(), nullable=False, server_default="[]")),
            ("completion_criteria", sa.Column("completion_criteria", sa.Text())),
        ]:
            if name not in columns:
                batch.add_column(column)
    for name, table, column in [("ix_tasks_goal_id", "tasks", "goal_id"), ("ix_tasks_scheduled_date", "tasks", "scheduled_date")]:
        if name not in {i["name"] for i in sa.inspect(bind).get_indexes(table)}:
            op.create_index(name, table, [column])


def downgrade():
    op.drop_index("ix_tasks_scheduled_date", table_name="tasks")
    op.drop_index("ix_tasks_goal_id", table_name="tasks")
    with op.batch_alter_table("tasks") as batch:
        batch.drop_constraint("fk_tasks_goal_id_goals", type_="foreignkey")
        for name in ("completion_criteria", "dependencies", "priority", "duration_minutes", "deadline", "scheduled_date", "milestone", "goal_id"):
            batch.drop_column(name)
    op.drop_index("ix_goal_schedule_revisions_goal_id", table_name="goal_schedule_revisions")
    op.drop_table("goal_schedule_revisions")
    op.drop_index("ix_goals_user_id", table_name="goals")
    op.drop_table("goals")
