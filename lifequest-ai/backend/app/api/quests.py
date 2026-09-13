from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from typing import List

from app.core.database import get_db, get_next_sequence_value
from app.api.deps import get_current_user, CurrentUser
from app.models.quest import QuestStatusEnum, DifficultyEnum
from app.schemas.quest import QuestCreate, QuestUpdate, QuestResponse
from app.schemas.character import XPAwardResult
from app.services.progression import (
    calculate_level_from_total_xp,
    check_level_up,
    get_boss_damage,
)

router = APIRouter()

ATTRIBUTE_BONUS = 3  # attribute stat points per quest completion


def _get_quest_or_404(quest_id: int, user: CurrentUser, db: Database) -> dict:
    quest = db.quests.find_one({"id": quest_id, "user_id": user.id})
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return quest


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[QuestResponse])
def list_quests(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    cursor = db.quests.find({"user_id": current_user.id}).sort("created_at", -1)
    return list(cursor)


@router.post("/", response_model=QuestResponse, status_code=201)
def create_quest(
    quest_in: QuestCreate,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    quest_id = get_next_sequence_value(db, "quests")
    now = datetime.now(timezone.utc)
    data = quest_in.model_dump()
    data["id"] = quest_id
    data["user_id"] = current_user.id
    data["status"] = QuestStatusEnum.AVAILABLE.value
    data["created_at"] = now
    data["completed_at"] = None
    if isinstance(data.get("difficulty"), DifficultyEnum):
        data["difficulty"] = data["difficulty"].value

    db.quests.insert_one(data)
    return data


@router.get("/{quest_id}", response_model=QuestResponse)
def get_quest(
    quest_id: int,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return _get_quest_or_404(quest_id, current_user, db)


@router.put("/{quest_id}", response_model=QuestResponse)
def update_quest(
    quest_id: int,
    quest_in: QuestUpdate,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _get_quest_or_404(quest_id, current_user, db)
    update_data = quest_in.model_dump(exclude_none=True)
    if "difficulty" in update_data and isinstance(update_data["difficulty"], DifficultyEnum):
        update_data["difficulty"] = update_data["difficulty"].value
    if "status" in update_data and isinstance(update_data["status"], QuestStatusEnum):
        update_data["status"] = update_data["status"].value

    db.quests.update_one(
        {"id": quest_id, "user_id": current_user.id},
        {"$set": update_data},
    )
    return db.quests.find_one({"id": quest_id, "user_id": current_user.id})


@router.delete("/{quest_id}", status_code=204)
def delete_quest(
    quest_id: int,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _get_quest_or_404(quest_id, current_user, db)
    db.quests.delete_one({"id": quest_id, "user_id": current_user.id})


# ── COMPLETION ────────────────────────────────────────────────────────────────

@router.post("/{quest_id}/complete", response_model=XPAwardResult)
def complete_quest(
    quest_id: int,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    quest = _get_quest_or_404(quest_id, current_user, db)

    if quest.get("status") == QuestStatusEnum.COMPLETED.value or quest.get("status") == "COMPLETED":
        raise HTTPException(status_code=400, detail="Quest already completed")

    now = datetime.now(timezone.utc)

    # 1. Mark quest complete
    db.quests.update_one(
        {"id": quest_id},
        {"$set": {"status": QuestStatusEnum.COMPLETED.value, "completed_at": now}},
    )

    # 2. Load character
    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    old_xp = character.get("xp", 0)
    old_level = calculate_level_from_total_xp(old_xp)

    # 3. Award XP + Gold
    xp_reward = quest.get("xp_reward", 0)
    gold_reward = quest.get("gold_reward", 0)
    new_xp = old_xp + xp_reward
    new_gold = character.get("gold", 0) + gold_reward
    new_level = calculate_level_from_total_xp(new_xp)

    # 4. Award attribute bonus
    attribute_bonus = 0
    quest_attr = quest.get("attribute")
    if quest_attr:
        attr_key = quest_attr.lower()
        char_attrs = db.attributes.find_one({"character_id": character["id"]})
        if char_attrs and attr_key in char_attrs:
            db.attributes.update_one(
                {"character_id": character["id"]},
                {"$inc": {attr_key: ATTRIBUTE_BONUS}},
            )
            attribute_bonus = ATTRIBUTE_BONUS

    # 5. Update streak
    today = now.date()
    last_quest = db.quests.find_one(
        {
            "user_id": current_user.id,
            "status": QuestStatusEnum.COMPLETED.value,
            "id": {"$ne": quest_id},
        },
        sort=[("completed_at", -1)],
    )

    streak_days = character.get("streak_days", 0)
    if last_quest and last_quest.get("completed_at"):
        comp_at = last_quest["completed_at"]
        last_date = comp_at.date() if hasattr(comp_at, "date") else comp_at
        diff = (today - last_date).days
        if diff == 1:
            streak_days += 1
        elif diff > 1:
            streak_days = 1
    else:
        streak_days = 1

    max_streak = max(character.get("max_streak", 0), streak_days)

    db.characters.update_one(
        {"id": character["id"]},
        {
            "$set": {
                "xp": new_xp,
                "gold": new_gold,
                "level": new_level,
                "streak_days": streak_days,
                "max_streak": max_streak,
            }
        },
    )

    # 6. Damage active boss
    active_boss = db.bosses.find_one({"is_active": True})
    if active_boss:
        diff_str = quest.get("difficulty", "MEDIUM")
        if hasattr(diff_str, "value"):
            diff_str = diff_str.value
        damage = get_boss_damage(str(diff_str))
        new_hp = max(0, active_boss.get("current_hp", 1000) - damage)
        is_active = new_hp > 0
        db.bosses.update_one(
            {"id": active_boss["id"]},
            {"$set": {"current_hp": new_hp, "is_active": is_active}},
        )

    level_up_info = check_level_up(old_xp, new_xp)

    return XPAwardResult(
        old_xp=old_xp,
        new_xp=new_xp,
        xp_awarded=xp_reward,
        old_level=old_level,
        new_level=new_level,
        leveled_up=level_up_info is not None,
        level_up_info=level_up_info,
        gold_awarded=gold_reward,
        new_gold=new_gold,
        attribute=quest_attr,
        attribute_bonus=attribute_bonus,
    )
