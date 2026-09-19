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
from app.services.rpg_expansion import (
    get_character_class_info,
    get_equipped_perks,
    evaluate_achievements,
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


@router.post("/{quest_id}/subtasks/{subtask_id}/toggle", response_model=QuestResponse)
def toggle_quest_subtask(
    quest_id: int,
    subtask_id: str,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    quest = _get_quest_or_404(quest_id, current_user, db)
    subtasks = quest.get("subtasks", [])
    found = False
    for st in subtasks:
        if str(st.get("id")) == str(subtask_id):
            st["completed"] = not st.get("completed", False)
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Subtask not found on this quest")

    db.quests.update_one(
        {"id": quest_id, "user_id": current_user.id},
        {"$set": {"subtasks": subtasks}},
    )
    return db.quests.find_one({"id": quest_id, "user_id": current_user.id})


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

    # 3. Calculate RPG class and equipped item perks
    class_info = get_character_class_info(character.get("character_class"))
    perks, active_labels = get_equipped_perks(db, character)

    base_xp = quest.get("xp_reward", 0)
    base_gold = quest.get("gold_reward", 0)

    xp_multiplier = class_info.get("xp_multiplier", 1.0) * (1.0 + perks.get("xp_boost", 0.0))
    gold_multiplier = class_info.get("gold_multiplier", 1.0) * (1.0 + perks.get("gold_boost", 0.0))

    final_xp_reward = int(round(base_xp * xp_multiplier))
    final_gold_reward = int(round(base_gold * gold_multiplier))

    new_xp = old_xp + final_xp_reward
    new_gold = character.get("gold", 0) + final_gold_reward
    new_level = calculate_level_from_total_xp(new_xp)

    # 4. Award attribute bonus (with class affinity multiplier)
    attribute_bonus = 0
    quest_attr = quest.get("attribute")
    if quest_attr:
        attr_key = quest_attr.lower()
        bonus = ATTRIBUTE_BONUS
        if attr_key in class_info.get("favored_attributes", []):
            bonus = int(round(ATTRIBUTE_BONUS * class_info.get("attribute_multiplier", 1.25)))

        char_attrs = db.attributes.find_one({"character_id": character["id"]})
        if char_attrs and attr_key in char_attrs:
            db.attributes.update_one(
                {"character_id": character["id"]},
                {"$inc": {attr_key: bonus}},
            )
            attribute_bonus = bonus

    # 5. Update streak (with Streak Shield perk support)
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
    has_streak_shield = perks.get("streak_shield", 0.0) > 0.0

    if last_quest and last_quest.get("completed_at"):
        comp_at = last_quest["completed_at"]
        last_date = comp_at.date() if hasattr(comp_at, "date") else comp_at
        diff = (today - last_date).days
        if diff <= 1:
            streak_days += 1
        elif diff == 2 and has_streak_shield:
            # Shield protected the streak!
            streak_days += 1
        else:
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

    # 6. Damage active boss (boosted by class and equipped weapon perks)
    boss_damage_dealt = 0
    active_boss = db.bosses.find_one({"is_active": True})
    if active_boss:
        diff_str = quest.get("difficulty", "MEDIUM")
        if hasattr(diff_str, "value"):
            diff_str = diff_str.value
        base_damage = get_boss_damage(str(diff_str))
        boss_mult = class_info.get("boss_damage_multiplier", 1.0) * (1.0 + perks.get("boss_damage_boost", 0.0))
        boss_damage_dealt = int(round(base_damage * boss_mult))

        new_hp = max(0, active_boss.get("current_hp", 1000) - boss_damage_dealt)
        is_active = new_hp > 0
        db.bosses.update_one(
            {"id": active_boss["id"]},
            {"$set": {"current_hp": new_hp, "is_active": is_active}},
        )

    # 7. Evaluate and award achievements
    all_completed_count = db.quests.count_documents({
        "user_id": current_user.id,
        "status": QuestStatusEnum.COMPLETED.value,
    })

    refreshed_char = db.characters.find_one({"id": character["id"]})
    unlocked_achievements = evaluate_achievements(
        db=db,
        character=refreshed_char,
        completed_quests_count=all_completed_count,
        current_time=now,
        boss_damage_dealt=boss_damage_dealt,
    )

    level_up_info = check_level_up(old_xp, new_xp)

    return XPAwardResult(
        old_xp=old_xp,
        new_xp=new_xp,
        xp_awarded=final_xp_reward,
        old_level=old_level,
        new_level=new_level,
        leveled_up=level_up_info is not None,
        level_up_info=level_up_info,
        gold_awarded=final_gold_reward,
        new_gold=new_gold,
        attribute=quest_attr,
        attribute_bonus=attribute_bonus,
        newly_unlocked_achievements=unlocked_achievements,
        perk_bonuses={
            "xp_multiplier": round(xp_multiplier, 2),
            "gold_multiplier": round(gold_multiplier, 2),
            "boss_damage": boss_damage_dealt,
            "active_perk_labels": active_labels,
        },
    )

