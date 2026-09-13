import certifi
from pymongo import MongoClient, ReturnDocument
from pymongo.database import Database
from app.core.config import settings

# Initialize PyMongo Client with TLS CA certificates
tls_ca = certifi.where() if "mongodb+srv" in settings.MONGODB_URL else None
mongo_client: MongoClient = MongoClient(
    settings.MONGODB_URL,
    tlsCAFile=tls_ca,
    serverSelectionTimeoutMS=10000,
)
db_instance: Database = mongo_client[settings.MONGODB_DB_NAME]


def get_db() -> Database:
    return db_instance


def get_next_sequence_value(db: Database, sequence_name: str) -> int:
    """
    Atomic auto-increment integer ID generator for collections.
    Keeps all IDs (user_id, character_id, quest_id, etc.) as clean integers,
    maintaining 100% compatibility with frontend schemas.
    """
    counter = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return counter["seq"]


def init_indexes(db: Database):
    """Ensure indexes exist on collections."""
    try:
        db.users.create_index("email", unique=True)
        db.users.create_index("id", unique=True)
        db.characters.create_index("id", unique=True)
        db.characters.create_index("user_id", unique=True)
        db.attributes.create_index("id", unique=True)
        db.attributes.create_index("character_id", unique=True)
        db.quests.create_index("id", unique=True)
        db.quests.create_index("user_id")
        db.items.create_index("id", unique=True)
        db.inventory.create_index("id", unique=True)
        db.inventory.create_index([("user_id", 1), ("item_id", 1)])
        db.bosses.create_index("id", unique=True)
    except Exception as e:
        print(f"Warning: Index creation error: {e}")


# Run index initialization
try:
    init_indexes(db_instance)
except Exception:
    pass

# Compatibility stub for any legacy imports
Base = object
