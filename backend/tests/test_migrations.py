from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command


def test_alembic_migrations_up_down_cycle(tmp_path, monkeypatch):
    """
    Test running Alembic migrations up to head, down to base, and back up to head.
    Verifies that all DDL scripts are idempotent and cleanly reversible.
    """
    alembic_cfg = Config("backend/alembic.ini")
    database_url = f"sqlite:///{(tmp_path / 'migrations.sqlite').as_posix()}"
    from backend.app.config import settings
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)

    command.upgrade(alembic_cfg, "6f1ae3c85bcd")
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO users (id, email, hashed_password, display_name, baseline_capacity, is_active) "
            "VALUES ('user-1', 'migration@steplight.ai', 'hash', 'Migration', 'medium', 1)"
        ))
        connection.execute(text(
            "INSERT INTO user_preferences "
            "(id, user_id, theme, default_duration, sound_enabled, gentle_reminders) "
            "VALUES ('pref-1', 'user-1', 'light', 15, 1, 1)"
        ))
        connection.execute(text(
            "INSERT INTO tasks (id, user_id, title, capacity, status) "
            "VALUES ('task-1', 'user-1', 'Legacy task', 'medium', 'in_progress')"
        ))

    command.upgrade(alembic_cfg, "head")
    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT status FROM tasks WHERE id = 'task-1'")
        ).scalar_one() == "active"
        assert connection.execute(
            text(
                "SELECT gemini_personalization_enabled FROM user_preferences "
                "WHERE user_id = 'user-1'"
            )
        ).scalar_one() in (0, False)
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(step_generations)"))
        }
        assert {
            "source",
            "model",
            "strategy_id",
            "guard_passed",
            "input_tokens",
            "output_tokens",
            "metadata_json",
        } <= columns
        feedback_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(step_feedback_events)"))
        }
        assert {
            "user_id",
            "task_id",
            "step_id",
            "idempotency_key",
            "request_fingerprint",
            "response_json",
        } <= feedback_columns
        step_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(steps)"))
        }
        assert {"source", "generation_id"} <= step_columns
        assert connection.execute(
            text("SELECT version FROM tasks WHERE id = 'task-1'")
        ).scalar_one() == 1
        assert {"version", "instruction", "effort", "research_suggestions"} <= step_columns
        task_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(tasks)"))
        }
        assert {"version", "original_input", "plan_goal", "description", "plan_model", "plan_guidance"} <= task_columns
        assert connection.execute(text("SELECT original_input FROM tasks WHERE id = 'task-1'")).scalar_one() == "Legacy task"
        assert connection.execute(text("SELECT COUNT(*) FROM users WHERE id = 'user-1'")).scalar_one() == 1
        assert connection.execute(
            text(
                "SELECT COUNT(*) FROM sqlite_master "
                "WHERE type = 'index' AND name = 'ix_step_feedback_user_task_created'"
            )
        ).scalar_one() == 1
    engine.dispose()

    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")
