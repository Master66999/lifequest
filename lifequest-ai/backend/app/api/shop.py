from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from typing import List

from app.core.database import get_db, get_next_sequence_value
from app.api.deps import get_current_user, CurrentUser
from app.schemas.item import ItemResponse, InventoryItemResponse, PurchaseRequest, PurchaseResponse

router = APIRouter()

NON_STACKABLE_RARITIES = {"LEGENDARY", "EPIC", "RARE"}


@router.get("/shop", response_model=List[ItemResponse])
def get_shop(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return list(db.items.find({}))


@router.get("/inventory", response_model=List[InventoryItemResponse])
def get_inventory(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    inv_docs = list(db.inventory.find({"user_id": current_user.id}))
    result = []
    for inv in inv_docs:
        item = db.items.find_one({"id": inv["item_id"]})
        if item:
            result.append({
                "id": inv["id"],
                "item_id": inv["item_id"],
                "quantity": inv["quantity"],
                "item": item,
            })
    return result


@router.post("/inventory/purchase", response_model=PurchaseResponse)
def purchase_item(
    purchase: PurchaseRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # 1. Validate item exists
    item = db.items.find_one({"id": purchase.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Validate price
    price = item.get("price", 0)
    if price <= 0:
        raise HTTPException(status_code=400, detail="Invalid item price")

    # 3. Check character gold
    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    current_gold = character.get("gold", 0)
    if current_gold < price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient gold. You have {current_gold}, item costs {price}."
        )

    # 4. Check for duplicate non-stackable items
    rarity = item.get("rarity", "").upper()
    if rarity in NON_STACKABLE_RARITIES:
        existing = db.inventory.find_one({"user_id": current_user.id, "item_id": item["id"]})
        if existing:
            raise HTTPException(status_code=400, detail=f"You already own '{item['name']}'")

    # 5. Deduct gold
    remaining_gold = current_gold - price
    db.characters.update_one({"id": character["id"]}, {"$set": {"gold": remaining_gold}})

    # 6. Add to inventory
    existing = db.inventory.find_one({"user_id": current_user.id, "item_id": item["id"]})
    if existing:
        db.inventory.update_one({"id": existing["id"]}, {"$inc": {"quantity": 1}})
    else:
        new_inv_id = get_next_sequence_value(db, "inventory")
        db.inventory.insert_one({
            "id": new_inv_id,
            "user_id": current_user.id,
            "item_id": item["id"],
            "quantity": 1,
        })

    return PurchaseResponse(
        success=True,
        item_name=item["name"],
        gold_spent=price,
        remaining_gold=remaining_gold,
        message=f"'{item['name']}' has been added to your inventory!",
    )
