"""
Quest CRUD + Quest Completion API.
Completion flow: validate ownership → award XP+Gold server-side → update attribute → check level-up → damage boss.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.quest import Quest, QuestStatusEnum
from app.models.character import Character, Attribute
from app.models.boss import Boss
from app.schemas.quest import QuestCreate, QuestUpdate, QuestResponse
from app.schemas.character import XPAwardResult
from app.services.progression import (
    calculate_level_from_total_xp,
    calculate_level_progress,
    check_level_up,
    get_boss_damage,
)

router = APIRouter()

ATTRIBUTE_BONUS = 3  # attribute stat points per quest completion


def _get_quest_or_404(quest_id: int, user: User, db: Session) -> Quest:
    quest = db.query(Quest).filter(Quest.id == quest_id, Quest.user_id == user.id).first()
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    return quest


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[QuestResponse])
def list_quests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Quest).filter(Quest.user_id == current_user.id).order_by(Quest.created_at.desc()).all()


@router.post("/", response_model=QuestResponse, status_code=201)
def create_quest(
    quest_in: QuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quest = Quest(user_id=current_user.id, **quest_in.model_dump())
    db.add(quest)
    db.commit()
    db.refresh(quest)
    return quest


@router.get("/{quest_id}", response_model=QuestResponse)
def get_quest(quest_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_quest_or_404(quest_id, current_user, db)


@router.put("/{quest_id}", response_model=QuestResponse)
def update_quest(
    quest_id: int,
    quest_in: QuestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quest = _get_quest_or_404(quest_id, current_user, db)
    for field, value in quest_in.model_dump(exclude_none=True).items():
        setattr(quest, field, value)
    db.commit()
    db.refresh(quest)
    return quest


@router.delete("/{quest_id}", status_code=204)
def delete_quest(quest_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quest = _get_quest_or_404(quest_id, current_user, db)
    db.delete(quest)
    db.commit()


# ── COMPLETION ────────────────────────────────────────────────────────────────

@router.post("/{quest_id}/complete", response_model=XPAwardResult)
def complete_quest(
    quest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quest = _get_quest_or_404(quest_id, current_user, db)

    if quest.status == QuestStatusEnum.COMPLETED:
        raise HTTPException(status_code=400, detail="Quest already completed")

    # ── 1. Mark quest complete ────────────────────────────────────────────────
    quest.status = QuestStatusEnum.COMPLETED
    quest.completed_at = datetime.now(timezone.utc)

    # ── 2. Load character (server-owned XP/Gold) ──────────────────────────────
    character: Character = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    old_xp = character.xp
    old_level = calculate_level_from_total_xp(old_xp)

    # ── 3. Award XP + Gold (server-side only!) ────────────────────────────────
    character.xp += quest.xp_reward
    character.gold += quest.gold_reward
    new_xp = character.xp
    new_level = calculate_level_from_total_xp(new_xp)
    character.level = new_level

    # ── 4. Award attribute bonus ──────────────────────────────────────────────
    attrs: Attribute = character.attributes
    attribute_bonus = 0
    if attrs and quest.attribute:
        attr_key = quest.attribute.lower()
        if hasattr(attrs, attr_key):
            setattr(attrs, attr_key, getattr(attrs, attr_key) + ATTRIBUTE_BONUS)
            attribute_bonus = ATTRIBUTE_BONUS

    # ── 5. Update streak ──────────────────────────────────────────────────────
    today = datetime.now(timezone.utc).date()
    # Simple streak logic: we check if the last completed quest was yesterday
    last_quest = (
        db.query(Quest)
        .filter(
            Quest.user_id == current_user.id,
            Quest.status == QuestStatusEnum.COMPLETED,
            Quest.id != quest.id,
        )
        .order_by(Quest.completed_at.desc())
        .first()
    )
    if last_quest and last_quest.completed_at:
        last_date = last_quest.completed_at.date()
        diff = (today - last_date).days
        if diff == 1:
            character.streak_days += 1
        elif diff > 1:
            character.streak_days = 1
        # diff == 0 means same day — streak stays the same
    else:
        character.streak_days = 1

    character.max_streak = max(character.max_streak, character.streak_days)

    # ── 6. Damage active boss ────────────────────────────────────────────────
    active_boss = db.query(Boss).filter(Boss.is_active == True).first()
    if active_boss:
        damage = get_boss_damage(quest.difficulty.value)
        active_boss.current_hp = max(0, active_boss.current_hp - damage)
        if active_boss.current_hp == 0:
            active_boss.is_active = False

    # ── 7. Commit all changes ─────────────────────────────────────────────────
    db.commit()
    db.refresh(character)

    level_up_info = check_level_up(old_xp, new_xp)

    return XPAwardResult(
        old_xp=old_xp,
        new_xp=new_xp,
        xp_awarded=quest.xp_reward,
        old_level=old_level,
        new_level=new_level,
        leveled_up=level_up_info is not None,
        level_up_info=level_up_info,
        gold_awarded=quest.gold_reward,
        new_gold=character.gold,
        attribute=quest.attribute,
        attribute_bonus=attribute_bonus,
    )
