from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BossResponse(BaseModel):
    id: int
    name: str
    total_hp: int
    current_hp: int
    is_active: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    hp_pct: float

    class Config:
        from_attributes = True
