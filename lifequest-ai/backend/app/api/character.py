from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.character import Character, Attribute
from app.schemas.character import CharacterWithAttributes, AttributeResponse
from app.services.progression import (
    calculate_level_from_total_xp,
    calculate_level_progress,
)

router = APIRouter()


def _enrich_character(char: Character) -> dict:
    """Adds computed level-progress fields to a character."""
    progress = calculate_level_progress(char.xp, char.level)
    return {
        "id": char.id,
        "user_id": char.user_id,
        "level": char.level,
        "xp": char.xp,
        "gold": char.gold,
        "streak_days": char.streak_days,
        "max_streak": char.max_streak,
        "xp_in_current_level": progress["xp_in_current_level"],
        "xp_needed_for_next": progress["xp_needed_for_next"],
        "progress_pct": progress["progress_pct"],
        "attributes": char.attributes,
    }


@router.get("/", response_model=CharacterWithAttributes)
def get_character(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    char = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return _enrich_character(char)


@router.get("/attributes", response_model=AttributeResponse)
def get_attributes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    char = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not char or not char.attributes:
        raise HTTPException(status_code=404, detail="Attributes not found")
    return char.attributes
