from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from app.core.database import get_db
from app.api.deps import get_current_user, CurrentUser
from app.schemas.character import (
    CharacterWithAttributes,
    AttributeResponse,
    ChooseClassRequest,
    AchievementResponse,
)
from app.services.progression import calculate_level_progress
from app.services.rpg_expansion import (
    CHARACTER_CLASSES,
    ALL_ACHIEVEMENTS,
    get_equipped_perks,
)

router = APIRouter()


def _enrich_character(char: dict, attrs: dict = None, db: Database = None) -> dict:
    """Adds computed level-progress, class, equipment, and perk fields to a character dictionary."""
    progress = calculate_level_progress(char.get("xp", 0), char.get("level", 1))
    equipped = char.get("equipped") or {"weapon": None, "armor": None, "relic": None}
    
    active_perks = []
    if db:
        _, active_perks = get_equipped_perks(db, char)

    return {
        "id": char["id"],
        "user_id": char["user_id"],
        "level": char.get("level", 1),
        "xp": char.get("xp", 0),
        "gold": char.get("gold", 0),
        "streak_days": char.get("streak_days", 0),
        "max_streak": char.get("max_streak", 0),
        "xp_in_current_level": progress["xp_in_current_level"],
        "xp_needed_for_next": progress["xp_needed_for_next"],
        "progress_pct": progress["progress_pct"],
        "character_class": char.get("character_class", "WARRIOR"),
        "equipped": equipped,
        "unlocked_achievements": char.get("unlocked_achievements", []),
        "active_perks": active_perks,
        "attributes": attrs,
    }


@router.get("/", response_model=CharacterWithAttributes)
def get_character(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    char = db.characters.find_one({"user_id": current_user.id})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    attrs = db.attributes.find_one({"character_id": char["id"]})
    return _enrich_character(char, attrs, db)


@router.get("/attributes", response_model=AttributeResponse)
def get_attributes(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    char = db.characters.find_one({"user_id": current_user.id})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    attrs = db.attributes.find_one({"character_id": char["id"]})
    if not attrs:
        raise HTTPException(status_code=404, detail="Attributes not found")
    return attrs


@router.get("/classes")
def get_available_classes():
    """Returns metadata for all playable character archetypes."""
    return list(CHARACTER_CLASSES.values())


@router.post("/choose-class", response_model=CharacterWithAttributes)
def choose_character_class(
    request: ChooseClassRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    char = db.characters.find_one({"user_id": current_user.id})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    target_class = request.character_class.upper()
    if target_class not in CHARACTER_CLASSES:
        raise HTTPException(status_code=400, detail=f"Invalid class. Choose from: {list(CHARACTER_CLASSES.keys())}")

    db.characters.update_one(
        {"id": char["id"]},
        {"$set": {"character_class": target_class}},
    )

    updated_char = db.characters.find_one({"id": char["id"]})
    attrs = db.attributes.find_one({"character_id": char["id"]})
    return _enrich_character(updated_char, attrs, db)


@router.get("/achievements", response_model=List[AchievementResponse])
def get_character_achievements(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    char = db.characters.find_one({"user_id": current_user.id})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    unlocked_ids = set(char.get("unlocked_achievements", []))
    result = []
    for ach in ALL_ACHIEVEMENTS:
        result.append(
            AchievementResponse(
                id=ach["id"],
                title=ach["title"],
                description=ach["description"],
                icon=ach["icon"],
                category=ach["category"],
                is_unlocked=ach["id"] in unlocked_ids,
                unlocked_at=None,
            )
        )
    return result

