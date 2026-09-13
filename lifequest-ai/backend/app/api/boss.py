from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, CurrentUser
from app.schemas.boss import BossResponse

router = APIRouter()


def _enrich_boss(boss: dict) -> dict:
    total_hp = boss.get("total_hp", 1000)
    current_hp = boss.get("current_hp", 1000)
    hp_pct = round((current_hp / total_hp) * 100, 1) if total_hp > 0 else 0
    return {
        "id": boss["id"],
        "name": boss["name"],
        "total_hp": total_hp,
        "current_hp": current_hp,
        "is_active": boss.get("is_active", True),
        "start_date": boss.get("start_date"),
        "end_date": boss.get("end_date"),
        "hp_pct": hp_pct,
    }


@router.get("/current", response_model=Optional[BossResponse])
def get_active_boss(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    boss = db.bosses.find_one({"is_active": True})
    if not boss:
        return None
    return _enrich_boss(boss)


@router.post("/{boss_id}/damage", response_model=BossResponse)
def deal_damage(
    boss_id: int,
    damage: int = 100,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    boss = db.bosses.find_one({"id": boss_id, "is_active": True})
    if not boss:
        raise HTTPException(status_code=404, detail="Active boss not found")

    damage = max(0, damage)
    new_hp = max(0, boss.get("current_hp", 1000) - damage)
    is_active = new_hp > 0

    db.bosses.update_one(
        {"id": boss_id},
        {"$set": {"current_hp": new_hp, "is_active": is_active}},
    )

    updated_boss = db.bosses.find_one({"id": boss_id})
    return _enrich_boss(updated_boss)
