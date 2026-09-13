"""
Demo seed script for MongoDB Atlas:
Populates the database with demo items, boss, demo user, character, and quests.
Run: python seed_demo.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


from datetime import datetime, timedelta, timezone
from app.core.database import get_db, get_next_sequence_value
from app.core.security import get_password_hash
from app.models.quest import DifficultyEnum, QuestStatusEnum

db = get_db()

try:
    # ── 1. Seed shop items ────────────────────────────────────────────────────
    if db.items.count_documents({}) == 0:
        shop_items = [
            {"name": "Focus Shield",       "description": "Protects your streak for one missed day",  "rarity": "RARE",      "price": 200,  "effect": "streak_shield",   "icon": "🛡️"},
            {"name": "Productivity Sword", "description": "+20% XP on next quest completion",          "rarity": "UNCOMMON",  "price": 150,  "effect": "xp_boost_20",     "icon": "⚔️"},
            {"name": "XP Booster",         "description": "Double XP for 1 hour",                      "rarity": "RARE",      "price": 300,  "effect": "xp_double_1h",    "icon": "⚡"},
            {"name": "Streak Shield",      "description": "Preserve streak through 2 missed days",     "rarity": "EPIC",      "price": 500,  "effect": "streak_shield_2", "icon": "🔥"},
            {"name": "Cyber Theme",        "description": "Unlocks the Cyber Matrix UI theme",          "rarity": "LEGENDARY", "price": 1000, "effect": "theme_cyber",     "icon": "🎨"},
            {"name": "Rare Avatar Frame",  "description": "Holographic avatar border",                  "rarity": "RARE",      "price": 400,  "effect": "avatar_frame",    "icon": "👤"},
            {"name": "Achievement Badge",  "description": "Display a prestige badge on your profile",   "rarity": "UNCOMMON",  "price": 100,  "effect": "badge",           "icon": "🏅"},
            {"name": "Gold Magnet",        "description": "+50% Gold from all quests for 24h",          "rarity": "EPIC",      "price": 600,  "effect": "gold_boost_24h",  "icon": "💰"},
        ]
        for item in shop_items:
            item_id = get_next_sequence_value(db, "items")
            item["id"] = item_id
            db.items.insert_one(item)
        print("✅ Seeded shop items")

    # ── 2. Seed weekly boss ───────────────────────────────────────────────────
    if db.bosses.count_documents({}) == 0:
        boss_id = get_next_sequence_value(db, "bosses")
        db.bosses.insert_one({
            "id": boss_id,
            "name": "THE PROCRASTINATION DEMON",
            "total_hp": 1000,
            "current_hp": 620,
            "is_active": True,
            "start_date": datetime.now(timezone.utc),
            "end_date": None,
        })
        print("✅ Seeded active boss")

    # ── 3. Demo user ──────────────────────────────────────────────────────────
    demo_email = "demo@lifequest.ai"
    existing_user = db.users.find_one({"email": demo_email})
    if existing_user:
        print("⏭️  Demo user already exists, skipping user seed.")
        sys.exit(0)

    user_id = get_next_sequence_value(db, "users")
    now = datetime.now(timezone.utc)
    db.users.insert_one({
        "id": user_id,
        "email": demo_email,
        "hashed_password": get_password_hash("demo1234"),
        "created_at": now,
    })

    char_id = get_next_sequence_value(db, "characters")
    db.characters.insert_one({
        "id": char_id,
        "user_id": user_id,
        "level": 1,
        "xp": 25,
        "gold": 300,
        "streak_days": 1,
        "max_streak": 3,
        "created_at": now,
    })

    attr_id = get_next_sequence_value(db, "attributes")
    db.attributes.insert_one({
        "id": attr_id,
        "character_id": char_id,
        "intellect": 25,
        "strength": 20,
        "focus": 30,
        "wisdom": 20,
        "creativity": 25,
        "social": 20,
        "discipline": 25,
    })

    # ── 4. Seed demo quests ───────────────────────────────────────────────────
    def make_quest(title, category, difficulty, xp_reward, gold_reward, attribute, status, due_date=None, completed_at=None):
        diff_val = difficulty.value if hasattr(difficulty, "value") else difficulty
        status_val = status.value if hasattr(status, "value") else status
        q_id = get_next_sequence_value(db, "quests")
        return {
            "id": q_id,
            "user_id": user_id,
            "title": title,
            "description": f"Quest: {title}",
            "category": category,
            "difficulty": diff_val,
            "estimated_minutes": 30,
            "xp_reward": xp_reward,
            "gold_reward": gold_reward,
            "attribute": attribute,
            "status": status_val,
            "due_date": due_date,
            "created_at": completed_at or now,
            "completed_at": completed_at,
        }

    completed_quests = [
        make_quest("Python Basics: Variables & Types",    "Data Science", DifficultyEnum.EASY,      60,  30,  "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=16)),
        make_quest("Python Basics: Loops & Functions",    "Data Science", DifficultyEnum.EASY,      60,  30,  "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=15)),
        make_quest("NumPy Array Operations",              "Data Science", DifficultyEnum.MEDIUM,    100, 50,  "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=14)),
        make_quest("NumPy Indexing & Slicing",            "Data Science", DifficultyEnum.MEDIUM,    100, 50,  "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=13)),
        make_quest("Pandas DataFrames",                   "Data Science", DifficultyEnum.MEDIUM,    120, 60,  "FOCUS",      QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=12)),
        make_quest("Data Cleaning with Pandas",           "Data Science", DifficultyEnum.HARD,      200, 100, "FOCUS",      QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=11)),
        make_quest("Morning Workout - 45 min",            "Fitness",      DifficultyEnum.MEDIUM,    80,  40,  "STRENGTH",   QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=10)),
        make_quest("Matplotlib Visualization",            "Data Science", DifficultyEnum.MEDIUM,    110, 55,  "CREATIVITY", QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=9)),
        make_quest("Statistics: Mean, Median, Mode",      "Data Science", DifficultyEnum.EASY,      70,  35,  "WISDOM",     QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=8)),
        make_quest("Read 20 Pages: Deep Work",            "Reading",      DifficultyEnum.EASY,      50,  25,  "WISDOM",     QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=7)),
        make_quest("Probability & Distributions",         "Data Science", DifficultyEnum.HARD,      200, 100, "WISDOM",     QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=6)),
        make_quest("Gym Session - Strength Training",     "Fitness",      DifficultyEnum.HARD,      180, 90,  "STRENGTH",   QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=5)),
        make_quest("Intro to Machine Learning",           "Data Science", DifficultyEnum.EPIC,      350, 175, "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=4)),
        make_quest("Meditate for 20 Minutes",             "Wellness",     DifficultyEnum.EASY,      40,  20,  "DISCIPLINE", QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=3)),
        make_quest("Scikit-learn: Linear Regression",     "Data Science", DifficultyEnum.HARD,      220, 110, "INTELLECT",  QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=2)),
        make_quest("Network with 2 Professionals",        "Social",       DifficultyEnum.MEDIUM,    90,  45,  "SOCIAL",     QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=1)),
        make_quest("Morning Run - 5km",                   "Fitness",      DifficultyEnum.MEDIUM,    80,  40,  "STRENGTH",   QuestStatusEnum.COMPLETED, completed_at=now - timedelta(hours=4)),
    ]
    db.quests.insert_many(completed_quests)

    active_quests = [
        make_quest("Complete NumPy Lesson 3",             "Data Science", DifficultyEnum.MEDIUM,    100, 50,  "INTELLECT",  QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest("Gym Workout - Push Day",              "Fitness",      DifficultyEnum.MEDIUM,    80,  40,  "STRENGTH",   QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest("Read 20 Pages: Atomic Habits",        "Reading",      DifficultyEnum.EASY,      50,  25,  "WISDOM",     QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest("Decision Trees & Random Forests",     "Data Science", DifficultyEnum.HARD,      250, 125, "INTELLECT",  QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=3)),
        make_quest("Build a Data Pipeline Project",       "Data Science", DifficultyEnum.LEGENDARY, 600, 300, "INTELLECT",  QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=7)),
    ]
    db.quests.insert_many(active_quests)
    print("✅ Seeded demo quests")

    # ── 5. Add inventory item ─────────────────────────────────────────────────
    focus_shield = db.items.find_one({"name": "Focus Shield"})
    if focus_shield:
        inv_id = get_next_sequence_value(db, "inventory")
        db.inventory.insert_one({
            "id": inv_id,
            "user_id": user_id,
            "item_id": focus_shield["id"],
            "quantity": 1,
        })
        print("✅ Seeded demo inventory")

    print(f"""
╔══════════════════════════════════════╗
║      DEMO SEED COMPLETE! 🎮          ║
║      DATABASE: MONGODB ATLAS         ║
╠══════════════════════════════════════╣
║  Email:    demo@lifequest.ai         ║
║  Password: demo1234                  ║
║  Level:    1                         ║
║  Streak:   1 day 🔥                  ║
╚══════════════════════════════════════╝
""")

except Exception as e:
    print(f"❌ Error during seed: {e}")
    raise
