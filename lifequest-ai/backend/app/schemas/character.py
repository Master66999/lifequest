from pydantic import BaseModel
from typing import Optional


class CharacterResponse(BaseModel):
    id: int
    user_id: int
    level: int
    xp: int
    gold: int
    streak_days: int
    max_streak: int
    xp_in_current_level: int
    xp_needed_for_next: int
    progress_pct: float

    class Config:
        from_attributes = True


class AttributeResponse(BaseModel):
    id: int
    character_id: int
    intellect: int
    strength: int
    focus: int
    wisdom: int
    creativity: int
    social: int
    discipline: int

    class Config:
        from_attributes = True


class CharacterWithAttributes(CharacterResponse):
    attributes: Optional[AttributeResponse] = None


class XPAwardResult(BaseModel):
    old_xp: int
    new_xp: int
    xp_awarded: int
    old_level: int
    new_level: int
    leveled_up: bool
    level_up_info: Optional[dict] = None
    gold_awarded: int
    new_gold: int
    attribute: Optional[str] = None
    attribute_bonus: int = 0
