import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal, engine, Base
from backend.app.models.user import User
from backend.app.models.task import Task, Step
from backend.app.models.preference import UserPreference
from backend.app.models.activity import ActivityEvent
from backend.app.core.security import hash_password


def seed_database(db: Session = None) -> None:
    """
    Seed initial development and testing fixtures.
    Creates demo user, second isolated user, default preferences, and sample tasks.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Check if demo user already exists
        demo_user = db.query(User).filter(User.email == "demo@steplight.ai").first()
        if not demo_user:
            demo_user = User(
                email="demo@steplight.ai",
                hashed_password=hash_password("gentlestep123"),
                display_name="Gentle Traveler",
                baseline_capacity="medium",
                is_active=True,
            )
            db.add(demo_user)
            db.flush()

            # Demo preferences
            demo_pref = UserPreference(
                user_id=demo_user.id,
                theme="light",
                default_duration=15,
                sound_enabled=True,
                gentle_reminders=True,
            )
            db.add(demo_pref)

            # Sample Task
            task = Task(
                user_id=demo_user.id,
                title="Gently sort physical workspace",
                notes="Zero pressure to finish everything. Just clearing a tiny pocket of calm.",
                capacity="medium",
                status="active",
            )
            db.add(task)
            db.flush()

            # Steps
            step1 = Step(
                task_id=task.id,
                order=1,
                title="Clear a 6-inch square on the desk",
                reason="Reduces immediate visual overwhelm so you can focus on one single spot.",
                estimated_duration=30,
                strategy="first_physical_movement",
                status="pending",
            )
            step2 = Step(
                task_id=task.id,
                order=2,
                title="Pick up three stray pens and set them in a holder",
                reason="A quick tactile win that creates momentum without fatigue.",
                estimated_duration=45,
                strategy="micro_sorting",
                status="pending",
            )
            step3 = Step(
                task_id=task.id,
                order=3,
                title="Take a sip of cool water and notice your shoulders drop",
                reason="Regulates autonomic nervous system after initiating action.",
                estimated_duration=30,
                strategy="grounding_hydration",
                status="pending",
            )
            db.add_all([step1, step2, step3])

            # Seed an activity event
            event = ActivityEvent(
                user_id=demo_user.id,
                event_type="task_created",
                metadata_json='{"title": "Gently sort physical workspace"}',
            )
            db.add(event)

        # Isolated second user for multi-tenant isolation testing
        user2 = db.query(User).filter(User.email == "companion@steplight.ai").first()
        if not user2:
            user2 = User(
                email="companion@steplight.ai",
                hashed_password=hash_password("gentlestep123"),
                display_name="Kindred Spirit",
                baseline_capacity="low",
                is_active=True,
            )
            db.add(user2)
            db.flush()

            user2_pref = UserPreference(
                user_id=user2.id,
                theme="dark",
                default_duration=10,
                sound_enabled=False,
                gentle_reminders=True,
            )
            db.add(user2_pref)

            user2_task = Task(
                user_id=user2.id,
                title="Private Companion Task - User 2 Only",
                notes="Strictly isolated from demo user.",
                capacity="low",
                status="active",
            )
            db.add(user2_task)

        db.commit()
        print("Database seeded successfully with demo and test fixtures.")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
