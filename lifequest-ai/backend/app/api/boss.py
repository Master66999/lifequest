"""
Boss Battle API.
The active boss is a global weekly boss — completing quests damages it.
Manual damage endpoint is also provided for UI demos.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.boss import Boss
from app.schemas.boss import BossResponse

router = APIRouter()


def _enrich_boss(boss: Boss) -> dict:
    hp_pct = round((boss.current_hp / boss.total_hp) * 100, 1) if boss.total_hp > 0 else 0
    return {
        "id": boss.id,
        "name": boss.name,
        "total_hp": boss.total_hp,
        "current_hp": boss.current_hp,
        "is_active": boss.is_active,
        "start_date": boss.start_date,
        "end_date": boss.end_date,
        "hp_pct": hp_pct,
    }


@router.get("/current", response_model=Optional[BossResponse])
def get_active_boss(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    boss = db.query(Boss).filter(Boss.is_active == True).first()
    if not boss:
        return None
    return _enrich_boss(boss)


@router.post("/{boss_id}/damage", response_model=BossResponse)
def deal_damage(
    boss_id: int,
    damage: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manual damage endpoint — used in demo mode / UI interactions."""
    boss = db.query(Boss).filter(Boss.id == boss_id, Boss.is_active == True).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Active boss not found")

    damage = max(0, damage)  # never allow negative damage (healing)
    boss.current_hp = max(0, boss.current_hp - damage)
    if boss.current_hp == 0:
        boss.is_active = False

    db.commit()
    db.refresh(boss)
    return _enrich_boss(boss)
