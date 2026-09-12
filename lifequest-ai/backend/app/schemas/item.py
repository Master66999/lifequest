from pydantic import BaseModel, field_validator
from typing import Optional


class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    rarity: str
    price: int
    effect: str
    icon: str

    class Config:
        from_attributes = True


class InventoryItemResponse(BaseModel):
    id: int
    item_id: int
    quantity: int
    item: ItemResponse

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
