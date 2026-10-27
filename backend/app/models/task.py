import uuid
from sqlalchemy import Boolean, Column, String, Integer, Text, DateTime, ForeignKey, JSON, Date, func
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    original_input = Column(Text, nullable=True)
    plan_goal = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    plan_model = Column(String(100), nullable=True)
    plan_guidance = Column(Boolean, nullable=False, default=False, server_default="0")
    goal_id = Column(String(36), ForeignKey("goals.id", ondelete="SET NULL"), nullable=True, index=True)
    milestone = Column(String(255), nullable=True)
    scheduled_date = Column(Date, nullable=True, index=True)
    deadline = Column(Date, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    priority = Column(Integer, nullable=False, default=3, server_default="3")
    dependencies = Column(JSON, nullable=False, default=list)
    completion_criteria = Column(Text, nullable=True)
    capacity = Column(String(20), nullable=False, default="medium")  # low, medium, high
    status = Column(String(20), nullable=False, default="active")  # active, paused, completed, archived
    version = Column(Integer, nullable=False, default=1, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="tasks")
    steps = relationship(
        "Step",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="Step.order",
    )
    generations = relationship(
        "StepGeneration",
        back_populates="task",
        cascade="all, delete-orphan",
    )


class Step(Base):
    __tablename__ = "steps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    order = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)
    instruction = Column(Text, nullable=True)
    effort = Column(String(20), nullable=True)
    research_suggestions = Column(JSON, nullable=True)
    estimated_duration = Column(Integer, nullable=False, default=300)  # seconds
    strategy = Column(String(100), nullable=False, default="first_physical_movement")
    source = Column(String(20), nullable=True)
    generation_id = Column(
        String(36),
        ForeignKey("step_generations.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String(20), nullable=False, default="pending")  # pending, completed, skipped
    version = Column(Integer, nullable=False, default=1, server_default="1")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    task = relationship("Task", back_populates="steps")


class StepGeneration(Base):
    __tablename__ = "step_generations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(20), nullable=False)
    model = Column(String(100), nullable=True)
    strategy_id = Column(String(100), nullable=True)
    guard_version = Column(String(30), nullable=False)
    guard_passed = Column(Boolean, nullable=False)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(String(32), nullable=True)
    metadata_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("Task", back_populates="generations")
