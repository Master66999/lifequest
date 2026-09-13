from fastapi import APIRouter, Depends
from pymongo.database import Database
from typing import Dict, Any

from app.core.database import get_db
from app.api.deps import get_current_user, CurrentUser
from app.models.quest import QuestStatusEnum

router = APIRouter()


@router.get("/")
def get_analytics(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Dict[str, Any]:
    char = db.characters.find_one({"user_id": current_user.id})
    all_quests = list(db.quests.find({"user_id": current_user.id}))

    completed = [
        q for q in all_quests
        if q.get("status") in (QuestStatusEnum.COMPLETED.value, "COMPLETED")
    ]
    failed = [
        q for q in all_quests
        if q.get("status") in (QuestStatusEnum.FAILED.value, "FAILED")
    ]

    total_quests = len(all_quests)
    total_completed = len(completed)
    completion_rate = round((total_completed / total_quests) * 100, 1) if total_quests > 0 else 0.0

    # XP per category
    category_xp: Dict[str, int] = {}
    for q in completed:
        cat = q.get("category") or "General"
        category_xp[cat] = category_xp.get(cat, 0) + q.get("xp_reward", 0)

    # Difficulty distribution
    difficulty_counts: Dict[str, int] = {}
    for q in completed:
        d = q.get("difficulty") or "MEDIUM"
        if hasattr(d, "value"):
            d = d.value
        difficulty_counts[str(d)] = difficulty_counts.get(str(d), 0) + 1

    # XP timeline (last 30 completed quests)
    timeline = []
    sorted_completed = sorted(
        completed,
        key=lambda x: x.get("completed_at") or x.get("created_at") or 0,
    )[-30:]

    for q in sorted_completed:
        comp_at = q.get("completed_at")
        if comp_at:
            date_str = comp_at.date().isoformat() if hasattr(comp_at, "date") else str(comp_at)[:10]
            timeline.append({
                "date": date_str,
                "xp": q.get("xp_reward", 0),
                "title": q.get("title", ""),
            })

    return {
        "level": char.get("level", 1) if char else 1,
        "total_xp": char.get("xp", 0) if char else 0,
        "total_gold": char.get("gold", 0) if char else 0,
        "streak_days": char.get("streak_days", 0) if char else 0,
        "max_streak": char.get("max_streak", 0) if char else 0,
        "total_quests": total_quests,
        "quests_completed": total_completed,
        "quests_failed": len(failed),
        "completion_rate": completion_rate,
        "category_xp": category_xp,
        "difficulty_distribution": difficulty_counts,
        "xp_timeline": timeline,
    }
