"""
Demo seed script: populates the database with a rich demo user state
matching the hackathon demo requirements (Level 12, 17-day streak, etc.)
Run: python seed_demo.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, engine
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.character import Character, Attribute
from app.models.quest import Quest, DifficultyEnum, QuestStatusEnum
from app.models.item import Item, Inventory
from app.models.boss import Boss
from app.services.progression import total_xp_for_level

import app.models  # ensure all models are imported

# ── Create all tables if they don't exist ─────────────────────────────────────
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # ── 1. Seed shop items ────────────────────────────────────────────────────
    if db.query(Item).count() == 0:
        items = [
            Item(name="Focus Shield",       description="Protects your streak for one missed day",  rarity="RARE",      price=200,  effect="streak_shield",   icon="🛡️"),
            Item(name="Productivity Sword", description="+20% XP on next quest completion",          rarity="UNCOMMON",  price=150,  effect="xp_boost_20",     icon="⚔️"),
            Item(name="XP Booster",         description="Double XP for 1 hour",                      rarity="RARE",      price=300,  effect="xp_double_1h",    icon="⚡"),
            Item(name="Streak Shield",      description="Preserve streak through 2 missed days",     rarity="EPIC",      price=500,  effect="streak_shield_2", icon="🔥"),
            Item(name="Cyber Theme",        description="Unlocks the Cyber Matrix UI theme",          rarity="LEGENDARY", price=1000, effect="theme_cyber",     icon="🎨"),
            Item(name="Rare Avatar Frame",  description="Holographic avatar border",                  rarity="RARE",      price=400,  effect="avatar_frame",    icon="👤"),
            Item(name="Achievement Badge",  description="Display a prestige badge on your profile",   rarity="UNCOMMON",  price=100,  effect="badge",           icon="🏅"),
            Item(name="Gold Magnet",        description="+50% Gold from all quests for 24h",          rarity="EPIC",      price=600,  effect="gold_boost_24h",  icon="💰"),
        ]
        db.add_all(items)
        db.commit()
        print("✅ Seeded shop items")

    # ── 2. Seed weekly boss ───────────────────────────────────────────────────
    if db.query(Boss).count() == 0:
        boss = Boss(
            name="THE PROCRASTINATION DEMON",
            total_hp=1000,
            current_hp=620,
            is_active=True,
        )
        db.add(boss)
        db.commit()
        print("✅ Seeded active boss")

    # ── 3. Demo user ──────────────────────────────────────────────────────────
    demo_email = "demo@lifequest.ai"
    existing = db.query(User).filter(User.email == demo_email).first()
    if existing:
        print("⏭️  Demo user already exists, skipping user seed.")
        db.close()
        sys.exit(0)

    demo_user = User(
        email=demo_email,
        hashed_password=get_password_hash("demo1234"),
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    # Level 1 = starter character
    level_1_xp = 25  # 25 XP into level 1
    char = Character(
        user_id=demo_user.id,
        level=1,
        xp=level_1_xp,
        gold=300,
        streak_days=1,
        max_streak=3,
    )
    db.add(char)
    db.commit()
    db.refresh(char)

    attrs = Attribute(
        character_id=char.id,
        intellect=25,
        strength=20,
        focus=30,
        wisdom=20,
        creativity=25,
        social=20,
        discipline=25,
    )
    db.add(attrs)
    db.commit()

    # ── 4. Seed quests ────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)

    def make_quest(**kwargs):
        return Quest(user_id=demo_user.id, **kwargs)

    completed_quests = [
        make_quest(title="Python Basics: Variables & Types",    category="Data Science", difficulty=DifficultyEnum.EASY,      xp_reward=60,  gold_reward=30,  attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=16)),
        make_quest(title="Python Basics: Loops & Functions",    category="Data Science", difficulty=DifficultyEnum.EASY,      xp_reward=60,  gold_reward=30,  attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=15)),
        make_quest(title="NumPy Array Operations",              category="Data Science", difficulty=DifficultyEnum.MEDIUM,    xp_reward=100, gold_reward=50,  attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=14)),
        make_quest(title="NumPy Indexing & Slicing",            category="Data Science", difficulty=DifficultyEnum.MEDIUM,    xp_reward=100, gold_reward=50,  attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=13)),
        make_quest(title="Pandas DataFrames",                   category="Data Science", difficulty=DifficultyEnum.MEDIUM,    xp_reward=120, gold_reward=60,  attribute="FOCUS",      status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=12)),
        make_quest(title="Data Cleaning with Pandas",           category="Data Science", difficulty=DifficultyEnum.HARD,      xp_reward=200, gold_reward=100, attribute="FOCUS",      status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=11)),
        make_quest(title="Morning Workout - 45 min",            category="Fitness",      difficulty=DifficultyEnum.MEDIUM,    xp_reward=80,  gold_reward=40,  attribute="STRENGTH",   status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=10)),
        make_quest(title="Matplotlib Visualization",            category="Data Science", difficulty=DifficultyEnum.MEDIUM,    xp_reward=110, gold_reward=55,  attribute="CREATIVITY", status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=9)),
        make_quest(title="Statistics: Mean, Median, Mode",      category="Data Science", difficulty=DifficultyEnum.EASY,      xp_reward=70,  gold_reward=35,  attribute="WISDOM",     status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=8)),
        make_quest(title="Read 20 Pages: Deep Work",            category="Reading",      difficulty=DifficultyEnum.EASY,      xp_reward=50,  gold_reward=25,  attribute="WISDOM",     status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=7)),
        make_quest(title="Probability & Distributions",         category="Data Science", difficulty=DifficultyEnum.HARD,      xp_reward=200, gold_reward=100, attribute="WISDOM",     status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=6)),
        make_quest(title="Gym Session - Strength Training",     category="Fitness",      difficulty=DifficultyEnum.HARD,      xp_reward=180, gold_reward=90,  attribute="STRENGTH",   status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=5)),
        make_quest(title="Intro to Machine Learning",           category="Data Science", difficulty=DifficultyEnum.EPIC,      xp_reward=350, gold_reward=175, attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=4)),
        make_quest(title="Meditate for 20 Minutes",             category="Wellness",     difficulty=DifficultyEnum.EASY,      xp_reward=40,  gold_reward=20,  attribute="DISCIPLINE", status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=3)),
        make_quest(title="Scikit-learn: Linear Regression",     category="Data Science", difficulty=DifficultyEnum.HARD,      xp_reward=220, gold_reward=110, attribute="INTELLECT",  status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=2)),
        make_quest(title="Network with 2 Professionals",        category="Social",       difficulty=DifficultyEnum.MEDIUM,    xp_reward=90,  gold_reward=45,  attribute="SOCIAL",     status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(days=1)),
        make_quest(title="Morning Run - 5km",                   category="Fitness",      difficulty=DifficultyEnum.MEDIUM,    xp_reward=80,  gold_reward=40,  attribute="STRENGTH",   status=QuestStatusEnum.COMPLETED, completed_at=now - timedelta(hours=4)),
    ]
    db.add_all(completed_quests)

    active_quests = [
        make_quest(title="Complete NumPy Lesson 3",             category="Data Science", difficulty=DifficultyEnum.MEDIUM,    xp_reward=100, gold_reward=50,  attribute="INTELLECT",  status=QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest(title="Gym Workout - Push Day",              category="Fitness",      difficulty=DifficultyEnum.MEDIUM,    xp_reward=80,  gold_reward=40,  attribute="STRENGTH",   status=QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest(title="Read 20 Pages: Atomic Habits",        category="Reading",      difficulty=DifficultyEnum.EASY,      xp_reward=50,  gold_reward=25,  attribute="WISDOM",     status=QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=1)),
        make_quest(title="Decision Trees & Random Forests",     category="Data Science", difficulty=DifficultyEnum.HARD,      xp_reward=250, gold_reward=125, attribute="INTELLECT",  status=QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=3)),
        make_quest(title="Build a Data Pipeline Project",       category="Data Science", difficulty=DifficultyEnum.LEGENDARY, xp_reward=600, gold_reward=300, attribute="INTELLECT",  status=QuestStatusEnum.AVAILABLE, due_date=now + timedelta(days=7)),
    ]
    db.add_all(active_quests)

    db.commit()
    print("✅ Seeded demo quests")

    # ── 5. Add inventory item ─────────────────────────────────────────────────
    focus_shield = db.query(Item).filter(Item.name == "Focus Shield").first()
    if focus_shield:
        db.add(Inventory(user_id=demo_user.id, item_id=focus_shield.id, quantity=1))
        db.commit()
        print("✅ Seeded demo inventory")

    print(f"""
╔══════════════════════════════════════╗
║      DEMO SEED COMPLETE! 🎮          ║
╠══════════════════════════════════════╣
║  Email:    demo@lifequest.ai         ║
║  Password: demo1234                  ║
║  Level:    12                        ║
║  Streak:   17 days 🔥                ║
╚══════════════════════════════════════╝
""")

finally:
    db.close()
