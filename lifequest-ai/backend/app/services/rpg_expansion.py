"""
RPG Expansion Service for LIFEQUEST AI:
Manages Character Classes, Equipment Perks, and Achievements & Badges.
"""
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from pymongo.database import Database

CHARACTER_CLASSES = {
    "WARRIOR": {
        "id": "WARRIOR",
        "name": "Warrior",
        "title": "Vanguard of Grit",
        "icon": "⚔️",
        "description": "Master of physical might and grit. +25% Strength & Discipline attribute gain, +20% Boss Damage.",
        "favored_attributes": ["strength", "discipline"],
        "attribute_multiplier": 1.25,
        "boss_damage_multiplier": 1.20,
        "xp_multiplier": 1.0,
        "gold_multiplier": 1.0,
    },
    "MAGE": {
        "id": "MAGE",
        "name": "Mage",
        "title": "Arcane Scholar",
        "icon": "🔮",
        "description": "Seeker of arcane truth. +25% Intellect & Wisdom attribute gain, +15% XP from all quests.",
        "favored_attributes": ["intellect", "wisdom"],
        "attribute_multiplier": 1.25,
        "boss_damage_multiplier": 1.0,
        "xp_multiplier": 1.15,
        "gold_multiplier": 1.0,
    },
    "ROGUE": {
        "id": "ROGUE",
        "name": "Rogue",
        "title": "Shadow Vanguard",
        "icon": "🗡️",
        "description": "Agile specialist of razor focus. +25% Focus attribute gain, +30% Gold rewards on quests.",
        "favored_attributes": ["focus"],
        "attribute_multiplier": 1.25,
        "boss_damage_multiplier": 1.05,
        "xp_multiplier": 1.0,
        "gold_multiplier": 1.30,
    },
    "BARD": {
        "id": "BARD",
        "name": "Bard",
        "title": "Weaver of Inspiration",
        "icon": "🎭",
        "description": "Charismatic artisan of inspiration. +25% Creativity & Social attribute gain, +10% XP & Gold.",
        "favored_attributes": ["creativity", "social"],
        "attribute_multiplier": 1.25,
        "boss_damage_multiplier": 1.0,
        "xp_multiplier": 1.10,
        "gold_multiplier": 1.10,
    },
}

ALL_ACHIEVEMENTS = [
    {
        "id": "first_blood",
        "title": "First Blood",
        "description": "Complete your very first quest.",
        "icon": "⚔️",
        "category": "PROGRESSION",
    },
    {
        "id": "apprentice",
        "title": "Apprentice of Light",
        "description": "Reach Character Level 5.",
        "icon": "🌟",
        "category": "LEVEL",
    },
    {
        "id": "veteran",
        "title": "Veteran Champion",
        "description": "Reach Character Level 10.",
        "icon": "👑",
        "category": "LEVEL",
    },
    {
        "id": "night_owl",
        "title": "Night Owl",
        "description": "Complete a quest between 11 PM and 4 AM.",
        "icon": "🦉",
        "category": "SPECIAL",
    },
    {
        "id": "streak_7",
        "title": "Week of Resolve",
        "description": "Maintain an uninterrupted 7-day streak.",
        "icon": "🔥",
        "category": "STREAK",
    },
    {
        "id": "relentless",
        "title": "Relentless Vanguard",
        "description": "Maintain an uninterrupted 14-day streak.",
        "icon": "⚡",
        "category": "STREAK",
    },
    {
        "id": "centurion",
        "title": "Centurion",
        "description": "Complete 100 total quests.",
        "icon": "🛡️",
        "category": "PROGRESSION",
    },
    {
        "id": "dragon_slayer",
        "title": "Demon Purger",
        "description": "Deal a crushing blow to the weekly raid boss.",
        "icon": "🐉",
        "category": "COMBAT",
    },
    {
        "id": "wealthy",
        "title": "Hoarder of Spoils",
        "description": "Amass 500 or more Gold in your war chest.",
        "icon": "💰",
        "category": "ECONOMY",
    },
    {
        "id": "iron_clad",
        "title": "Battle Ready",
        "description": "Equip items in your Weapon, Armor, and Relic slots.",
        "icon": "🥋",
        "category": "EQUIPMENT",
    },
    {
        "id": "polymath",
        "title": "Master Polymath",
        "description": "Raise any single RPG attribute to 35 points or higher.",
        "icon": "🧠",
        "category": "ATTRIBUTES",
    },
]


def get_character_class_info(class_name: Optional[str]) -> dict:
    key = (class_name or "WARRIOR").upper()
    return CHARACTER_CLASSES.get(key, CHARACTER_CLASSES["WARRIOR"])


def get_equipped_perks(db: Database, character: dict) -> Tuple[Dict[str, float], List[str]]:
    """
    Reads equipped gear for a character and computes cumulative perk multipliers and descriptions.
    """
    equipped = character.get("equipped") or {"weapon": None, "armor": None, "relic": None}
    item_ids = [item_id for item_id in equipped.values() if item_id is not None]

    perks = {
        "xp_boost": 0.0,
        "boss_damage_boost": 0.0,
        "gold_boost": 0.0,
        "streak_shield": 0.0,
    }
    perk_labels = []

    if not item_ids:
        return perks, perk_labels

    items = list(db.items.find({"id": {"$in": item_ids}}))
    for item in items:
        p_type = item.get("perk_type")
        p_val = float(item.get("perk_value") or 0.0)
        effect = item.get("effect", "")

        # Map by perk_type or legacy effect
        if p_type == "xp_boost" or "xp_boost" in effect:
            perks["xp_boost"] += (p_val if p_val > 0 else 0.15)
            pct = int(perks["xp_boost"] * 100)
            perk_labels.append(f"+{pct}% Quest XP ({item.get('name')})")
        elif p_type == "boss_damage_boost" or "damage" in effect or "sword" in item.get("name", "").lower():
            perks["boss_damage_boost"] += (p_val if p_val > 0 else 0.20)
            pct = int(perks["boss_damage_boost"] * 100)
            perk_labels.append(f"+{pct}% Boss Damage ({item.get('name')})")
        elif p_type == "gold_boost" or "gold_boost" in effect:
            perks["gold_boost"] += (p_val if p_val > 0 else 0.25)
            pct = int(perks["gold_boost"] * 100)
            perk_labels.append(f"+{pct}% Gold Rewards ({item.get('name')})")
        elif p_type == "streak_shield" or "streak_shield" in effect:
            perks["streak_shield"] = max(perks["streak_shield"], p_val if p_val > 0 else 1.0)
            perk_labels.append(f"Streak Shield Active ({item.get('name')})")

    return perks, perk_labels


def evaluate_achievements(
    db: Database,
    character: dict,
    completed_quests_count: int,
    current_time: datetime,
    boss_damage_dealt: int = 0,
) -> List[dict]:
    """
    Evaluates all achievements against character progress.
    Persists any newly unlocked achievements to character document.
    Returns the list of newly unlocked achievements.
    """
    unlocked = set(character.get("unlocked_achievements") or [])
    newly_unlocked = []

    level = character.get("level", 1)
    streak = character.get("streak_days", 0)
    gold = character.get("gold", 0)
    equipped = character.get("equipped") or {}

    # Check criteria
    if "first_blood" not in unlocked and completed_quests_count >= 1:
        newly_unlocked.append("first_blood")

    if "apprentice" not in unlocked and level >= 5:
        newly_unlocked.append("apprentice")

    if "veteran" not in unlocked and level >= 10:
        newly_unlocked.append("veteran")

    if "streak_7" not in unlocked and streak >= 7:
        newly_unlocked.append("streak_7")

    if "relentless" not in unlocked and streak >= 14:
        newly_unlocked.append("relentless")

    if "centurion" not in unlocked and completed_quests_count >= 100:
        newly_unlocked.append("centurion")

    if "dragon_slayer" not in unlocked and boss_damage_dealt >= 100:
        newly_unlocked.append("dragon_slayer")

    if "wealthy" not in unlocked and gold >= 500:
        newly_unlocked.append("wealthy")

    if "night_owl" not in unlocked:
        hour = current_time.hour
        if hour >= 23 or hour <= 4:
            newly_unlocked.append("night_owl")

    if "iron_clad" not in unlocked:
        if equipped.get("weapon") and equipped.get("armor") and equipped.get("relic"):
            newly_unlocked.append("iron_clad")

    if "polymath" not in unlocked:
        attrs = db.attributes.find_one({"character_id": character.get("id")})
        if attrs:
            stat_keys = ["intellect", "strength", "focus", "wisdom", "creativity", "social", "discipline"]
            if any(attrs.get(k, 0) >= 35 for k in stat_keys):
                newly_unlocked.append("polymath")

    if newly_unlocked:
        db.characters.update_one(
            {"id": character["id"]},
            {"$addToSet": {"unlocked_achievements": {"$each": newly_unlocked}}},
        )

    # Return full achievement objects for response
    lookup = {a["id"]: a for a in ALL_ACHIEVEMENTS}
    return [
        {
            **lookup[aid],
            "is_unlocked": True,
            "unlocked_at": current_time.isoformat(),
        }
        for aid in newly_unlocked
        if aid in lookup
    ]
