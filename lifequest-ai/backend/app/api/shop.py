"""
Shop & Inventory API.
All purchase validation is server-side:
  - Item must exist
  - User must have enough gold (fetched from DB, not trusted from client)
  - No duplicate non-stackable items
  - Gold deducted atomically
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.item import Item, Inventory
from app.models.character import Character
from app.schemas.item import ItemResponse, InventoryItemResponse, PurchaseRequest, PurchaseResponse

router = APIRouter()

# Non-stackable item rarity tiers — player can only own 1 of these
NON_STACKABLE_RARITIES = {"LEGENDARY", "EPIC", "RARE"}


@router.get("/shop", response_model=List[ItemResponse])
def get_shop(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Item).all()


@router.get("/inventory", response_model=List[InventoryItemResponse])
def get_inventory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Inventory).filter(Inventory.user_id == current_user.id).all()


@router.post("/inventory/purchase", response_model=PurchaseResponse)
def purchase_item(
    purchase: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── 1. Validate item exists ───────────────────────────────────────────────
    item = db.query(Item).filter(Item.id == purchase.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # ── 2. Validate item price is positive (defense-in-depth) ─────────────────
    if item.price <= 0:
        raise HTTPException(status_code=400, detail="Invalid item price")

    # ── 3. Get character gold from DB (NEVER trust client) ────────────────────
    character = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if character.gold < item.price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient gold. You have {character.gold}, item costs {item.price}."
        )

    # ── 4. Check for duplicate non-stackable items ────────────────────────────
    if item.rarity.upper() in NON_STACKABLE_RARITIES:
        existing = db.query(Inventory).filter(
            Inventory.user_id == current_user.id,
            Inventory.item_id == item.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"You already own '{item.name}'")

    # ── 5. Deduct gold + add to inventory atomically ──────────────────────────
    character.gold -= item.price

    existing_entry = db.query(Inventory).filter(
        Inventory.user_id == current_user.id,
        Inventory.item_id == item.id
    ).first()

    if existing_entry:
        existing_entry.quantity += 1
    else:
        db.add(Inventory(user_id=current_user.id, item_id=item.id, quantity=1))

    db.commit()
    db.refresh(character)

    return PurchaseResponse(
        success=True,
        item_name=item.name,
        gold_spent=item.price,
        remaining_gold=character.gold,
        message=f"'{item.name}' has been added to your inventory!",
    )
