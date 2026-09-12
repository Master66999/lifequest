from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class DifficultyEnum(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    EPIC = "EPIC"
    LEGENDARY = "LEGENDARY"

class QuestStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"

class Quest(Base):
    __tablename__ = "quests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    description = Column(String)
    category = Column(String)
    difficulty = Column(Enum(DifficultyEnum), default=DifficultyEnum.MEDIUM)
    estimated_minutes = Column(Integer, default=30)
    xp_reward = Column(Integer, default=10)
    gold_reward = Column(Integer, default=5)
    attribute = Column(String)  # INTELLECT, STRENGTH, etc.
    status = Column(Enum(QuestStatusEnum), default=QuestStatusEnum.AVAILABLE)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="quests")
