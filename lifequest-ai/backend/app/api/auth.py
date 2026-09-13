from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.database import Database

from app.core.database import get_db, get_next_sequence_value
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings

router = APIRouter()


@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Database = Depends(get_db)):
    existing = db.users.find_one({"email": user_in.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = get_next_sequence_value(db, "users")
    hashed_password = get_password_hash(user_in.password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "id": user_id,
        "email": user_in.email,
        "hashed_password": hashed_password,
        "created_at": now,
    }
    db.users.insert_one(user_doc)

    # Automatically create a character and default attributes for the user
    char_id = get_next_sequence_value(db, "characters")
    char_doc = {
        "id": char_id,
        "user_id": user_id,
        "level": 1,
        "xp": 0,
        "gold": 0,
        "streak_days": 0,
        "max_streak": 0,
        "created_at": now,
    }
    db.characters.insert_one(char_doc)

    attr_id = get_next_sequence_value(db, "attributes")
    attr_doc = {
        "id": attr_id,
        "character_id": char_id,
        "intellect": 10,
        "strength": 10,
        "focus": 10,
        "wisdom": 10,
        "creativity": 10,
        "social": 10,
        "discipline": 10,
    }
    db.attributes.insert_one(attr_doc)

    return UserResponse(id=user_id, email=user_in.email)


@router.post("/login", response_model=Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Database = Depends(get_db),
):
    user = db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user["id"]), expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
