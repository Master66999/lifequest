import logging
import certifi
from pymongo import MongoClient, ReturnDocument
from pymongo.database import Database
from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_mongo_client() -> MongoClient:
    url = settings.MONGODB_URL
    is_srv = "mongodb+srv" in url

    # 1. Primary connection with certifi CA certificates
    try:
        kwargs = {"serverSelectionTimeoutMS": 10000}
        if is_srv:
            kwargs["tls"] = True
            kwargs["tlsCAFile"] = certifi.where()
        client = MongoClient(url, **kwargs)
        client.admin.command("ping")
        return client
    except Exception as exc:
        logger.warning(f"Standard TLS connection failed: {exc}. Retrying with TLS fallback...")

    # 2. Fallback connection for environments with strict/custom OpenSSL (e.g. Render Linux)
    try:
        client = MongoClient(
            url,
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=10000,
        )
        client.admin.command("ping")
        return client
    except Exception as exc:
        logger.error(f"Fallback TLS connection failed: {exc}")
        # Return basic client without raising so application loads
        return MongoClient(url, serverSelectionTimeoutMS=10000)


mongo_client: MongoClient = _create_mongo_client()
db_instance: Database = mongo_client[settings.MONGODB_DB_NAME]


def get_db() -> Database:
    return db_instance


def get_next_sequence_value(db: Database, sequence_name: str) -> int:
    """
    Atomic auto-increment integer ID generator for collections.
    Keeps all IDs as clean integers, maintaining compatibility with frontend schemas.
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
        logger.warning(f"Index creation warning: {e}")


# Compatibility stub
Base = object
