"""
Centralized RPG Progression Engine.
All XP/Level/Gold calculations happen HERE on the server.
Frontend never authoratively sets these values.
"""
import math
from typing import Optional

# Config constants — change these to tune game feel
BASE_XP: int = 100
XP_EXPONENT: float = 1.5

# Attribute points awarded per level-up
ATTRIBUTE_POINTS_PER_LEVEL: int = 2
SKILL_POINTS_PER_LEVEL: int = 1

# Boss damage mapping by difficulty
BOSS_DAMAGE = {
    "EASY": 50,
    "MEDIUM": 100,
    "HARD": 200,
    "EPIC": 350,
    "LEGENDARY": 500,
}


def xp_required_for_level(level: int) -> int:
    """
    Non-linear XP curve: BASE_XP * level^1.5
    Level 1  → 100 XP
    Level 5  → 1118 XP
    Level 10 → 3162 XP
    Level 20 → 8944 XP
    """
    return max(1, math.floor(BASE_XP * (level ** XP_EXPONENT)))


def total_xp_for_level(level: int) -> int:
    """Cumulative XP needed to reach a given level from level 0."""
    return sum(xp_required_for_level(l) for l in range(1, level))


def calculate_level_from_total_xp(total_xp: int) -> int:
    """Given total accumulated XP, what level is the character?"""
    level = 1
    while total_xp >= total_xp_for_level(level + 1):
        level += 1
        if level >= 999:
            break
    return level


def calculate_xp_for_next_level(current_level: int) -> int:
    """XP needed to go from current_level to current_level+1."""
    return xp_required_for_level(current_level)


def calculate_level_progress(total_xp: int, current_level: int) -> dict:
    """
    Returns current XP within the current level bracket,
    total XP needed for next level, and progress percentage.
    """
    xp_at_level_start = total_xp_for_level(current_level)
    xp_needed = xp_required_for_level(current_level)
    xp_in_current_level = total_xp - xp_at_level_start
    progress_pct = min(100.0, (xp_in_current_level / xp_needed) * 100) if xp_needed > 0 else 100.0
    return {
        "xp_in_current_level": xp_in_current_level,
        "xp_needed_for_next": xp_needed,
        "progress_pct": round(progress_pct, 1),
    }


def check_level_up(old_xp: int, new_xp: int) -> Optional[dict]:
    """
    Checks if adding XP caused a level up.
    Returns level-up info if yes, None otherwise.
    """
    old_level = calculate_level_from_total_xp(old_xp)
    new_level = calculate_level_from_total_xp(new_xp)
    if new_level > old_level:
        return {
            "leveled_up": True,
            "old_level": old_level,
            "new_level": new_level,
            "levels_gained": new_level - old_level,
            "skill_points_earned": (new_level - old_level) * SKILL_POINTS_PER_LEVEL,
            "attribute_points_earned": (new_level - old_level) * ATTRIBUTE_POINTS_PER_LEVEL,
        }
    return None


def get_boss_damage(difficulty: str) -> int:
    return BOSS_DAMAGE.get(difficulty.upper(), 50)
