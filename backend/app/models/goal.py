import uuid
from sqlalchemy import Column, String, Text, Integer, Date, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Goal(Base):
    __tablename__ = "goals"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    outcome = Column(Text, nullable=False)
    deadline = Column(Date, nullable=False)
    skill_level = Column(String(30), nullable=False)
    minutes_per_day = Column(Integer, nullable=False)
    working_days = Column(JSON, nullable=False, default=list)
    capacity = Column(String(20), nullable=False, default="medium")
    constraints = Column(Text, nullable=True)
    answers = Column(JSON, nullable=False, default=dict)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    revisions = relationship("GoalScheduleRevision", back_populates="goal", cascade="all, delete-orphan")


class GoalScheduleRevision(Base):
    __tablename__ = "goal_schedule_revisions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = Column(String(36), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(500), nullable=False)
    changes = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    goal = relationship("Goal", back_populates="revisions")
