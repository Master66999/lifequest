from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from app.core.database import get_db
from app.api.deps import get_current_user, CurrentUser
from app.schemas.character import CharacterWithAttributes, AttributeResponse
from app.services.progression import calculate_level_progress

router = APIRouter()


def _enrich_character(char: dict, attrs: dict = None) -> dict:
    """Adds computed level-progress fields to a character dictionary."""
    progress = calculate_level_progress(char.get("xp", 0), char.get("level", 1))
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
    return _enrich_character(char, attrs)


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
