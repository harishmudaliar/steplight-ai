import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    theme = Column(String(20), nullable=False, default="light")  # light, dark, system
    default_duration = Column(Integer, nullable=False, default=15)  # minutes
    sound_enabled = Column(Boolean, nullable=False, default=True)
    gentle_reminders = Column(Boolean, nullable=False, default=True)
    gemini_personalization_enabled = Column(Boolean, nullable=False, default=False, server_default="0")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="preferences")
