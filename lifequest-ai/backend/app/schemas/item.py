from pydantic import BaseModel, field_validator
from typing import Optional, Dict


class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    rarity: str
    price: int
    effect: str
    icon: str
    slot: Optional[str] = "CONSUMABLE"  # WEAPON, ARMOR, RELIC, CONSUMABLE
    perk_type: Optional[str] = None    # xp_boost, boss_damage_boost, streak_shield, gold_boost
    perk_value: Optional[float] = 0.0

    class Config:
        from_attributes = True


class InventoryItemResponse(BaseModel):
    id: int
    item_id: int
    quantity: int
    item: ItemResponse
    is_equipped: bool = False
    equipped_slot: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    item_id: int

    @field_validator("item_id")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("item_id must be positive")
        return v


class PurchaseResponse(BaseModel):
    success: bool
    item_name: str
    gold_spent: int
    remaining_gold: int
    message: str


class EquipRequest(BaseModel):
    item_id: int
    slot: Optional[str] = None  # WEAPON, ARMOR, RELIC (optional, inferred from item if omitted)


class UnequipRequest(BaseModel):
    slot: str  # WEAPON, ARMOR, RELIC


class EquipResponse(BaseModel):
    success: bool
    message: str
    equipped: Dict[str, Optional[int]]
    active_perks: list[str] = []

