"""
Analytics API — aggregated stats for a user's progression.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.quest import Quest, QuestStatusEnum
from app.models.character import Character

router = APIRouter()


@router.get("/")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    char: Character = db.query(Character).filter(Character.user_id == current_user.id).first()
    all_quests = db.query(Quest).filter(Quest.user_id == current_user.id).all()
    completed = [q for q in all_quests if q.status == QuestStatusEnum.COMPLETED]
    failed = [q for q in all_quests if q.status == QuestStatusEnum.FAILED]

    total_quests = len(all_quests)
    total_completed = len(completed)
    completion_rate = round((total_completed / total_quests) * 100, 1) if total_quests > 0 else 0.0

    # XP per category
    category_xp: Dict[str, int] = {}
    for q in completed:
        cat = q.category or "General"
        category_xp[cat] = category_xp.get(cat, 0) + q.xp_reward

    # Difficulty distribution
    difficulty_counts: Dict[str, int] = {}
    for q in completed:
        d = q.difficulty.value if q.difficulty else "MEDIUM"
        difficulty_counts[d] = difficulty_counts.get(d, 0) + 1

    # XP timeline (last 30 completed quests)
    timeline = []
    for q in sorted(completed, key=lambda x: x.completed_at or q.created_at)[-30:]:
        if q.completed_at:
            timeline.append({
                "date": q.completed_at.date().isoformat(),
                "xp": q.xp_reward,
                "title": q.title,
            })

    return {
        "level": char.level if char else 1,
        "total_xp": char.xp if char else 0,
        "total_gold": char.gold if char else 0,
        "streak_days": char.streak_days if char else 0,
        "max_streak": char.max_streak if char else 0,
        "total_quests": total_quests,
        "quests_completed": total_completed,
        "quests_failed": len(failed),
        "completion_rate": completion_rate,
        "category_xp": category_xp,
        "difficulty_distribution": difficulty_counts,
        "xp_timeline": timeline,
    }
