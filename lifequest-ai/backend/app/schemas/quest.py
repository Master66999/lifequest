from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.models.quest import DifficultyEnum, QuestStatusEnum


class QuestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    difficulty: DifficultyEnum = DifficultyEnum.MEDIUM
    estimated_minutes: Optional[int] = 30
    xp_reward: int
    gold_reward: int
    attribute: Optional[str] = "DISCIPLINE"
    due_date: Optional[datetime] = None

    @field_validator("xp_reward", "gold_reward")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Reward values must be non-negative")
        return v


class QuestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[DifficultyEnum] = None
    estimated_minutes: Optional[int] = None
    xp_reward: Optional[int] = None
    gold_reward: Optional[int] = None
    attribute: Optional[str] = None
    status: Optional[QuestStatusEnum] = None
    due_date: Optional[datetime] = None


class QuestResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    difficulty: DifficultyEnum
    estimated_minutes: Optional[int]
    xp_reward: int
    gold_reward: int
    attribute: Optional[str]
    status: QuestStatusEnum
    due_date: Optional[datetime]
    created_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
