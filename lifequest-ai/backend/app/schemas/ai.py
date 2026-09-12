from pydantic import BaseModel, field_validator
from typing import Optional, List


# ── Requests ──────────────────────────────────────────────────────────────────

class GenerateCampaignRequest(BaseModel):
    goal: str
    timeframe: Optional[str] = "3 months"

    @field_validator("goal")
    @classmethod
    def goal_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Goal cannot be empty")
        if len(v) > 500:
            raise ValueError("Goal must be 500 characters or less")
        return v


class AuraMessageRequest(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def message_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


# ── AI Quest Sub-schemas (validated Pydantic models) ──────────────────────────

class GeneratedQuestSchema(BaseModel):
    title: str
    description: str
    category: str
    difficulty: str
    estimated_minutes: int
    xp_reward: int
    gold_reward: int
    attribute: str
    reasoning: str

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        valid = {"EASY", "MEDIUM", "HARD", "EPIC", "LEGENDARY"}
        v = v.upper()
        if v not in valid:
            v = "MEDIUM"
        return v

    @field_validator("attribute")
    @classmethod
    def validate_attribute(cls, v: str) -> str:
        valid = {"INTELLECT", "STRENGTH", "FOCUS", "WISDOM", "CREATIVITY", "SOCIAL", "DISCIPLINE"}
        v = v.upper()
        if v not in valid:
            v = "DISCIPLINE"
        return v

    @field_validator("xp_reward", "gold_reward")
    @classmethod
    def clamp_rewards(cls, v: int) -> int:
        return max(10, min(v, 1000))

    @field_validator("estimated_minutes")
    @classmethod
    def clamp_time(cls, v: int) -> int:
        return max(5, min(v, 480))


class GeneratedChapterSchema(BaseModel):
    chapter_number: int
    chapter_name: str
    quests: List[GeneratedQuestSchema]


class GeneratedCampaignSchema(BaseModel):
    campaign_name: str
    campaign_description: str
    chapters: List[GeneratedChapterSchema]


# ── Responses ─────────────────────────────────────────────────────────────────

class AuraResponse(BaseModel):
    message: str
    suggested_action: Optional[str] = None


class CampaignResponse(BaseModel):
    campaign_name: str
    campaign_description: str
    chapters: List[GeneratedChapterSchema]
    quests_created: int
    message: str
