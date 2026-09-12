from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    gold = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="character")
    attributes = relationship("Attribute", back_populates="character", uselist=False)

class Attribute(Base):
    __tablename__ = "attributes"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"), unique=True)
    intellect = Column(Integer, default=10)
    strength = Column(Integer, default=10)
    focus = Column(Integer, default=10)
    wisdom = Column(Integer, default=10)
    creativity = Column(Integer, default=10)
    social = Column(Integer, default=10)
    discipline = Column(Integer, default=10)

    character = relationship("Character", back_populates="attributes")
