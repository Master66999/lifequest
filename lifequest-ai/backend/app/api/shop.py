from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database
from typing import List

from app.core.database import get_db, get_next_sequence_value
from app.api.deps import get_current_user, CurrentUser
from app.schemas.item import (
    ItemResponse,
    InventoryItemResponse,
    PurchaseRequest,
    PurchaseResponse,
    EquipRequest,
    UnequipRequest,
    EquipResponse,
)
from app.services.rpg_expansion import get_equipped_perks

router = APIRouter()

NON_STACKABLE_RARITIES = {"LEGENDARY", "EPIC", "RARE"}
VALID_SLOTS = {"weapon", "armor", "relic"}


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
    character = db.characters.find_one({"user_id": current_user.id})
    equipped = (character.get("equipped") if character else None) or {"weapon": None, "armor": None, "relic": None}
    
    # Invert mapping: item_id -> slot
    equipped_lookup = {}
    for slot_name, item_id in equipped.items():
        if item_id is not None:
            equipped_lookup[item_id] = slot_name.upper()

    inv_docs = list(db.inventory.find({"user_id": current_user.id}))
    result = []
    for inv in inv_docs:
        item = db.items.find_one({"id": inv["item_id"]})
        if item:
            item_id = inv["item_id"]
            is_eq = item_id in equipped_lookup
            result.append({
                "id": inv["id"],
                "item_id": item_id,
                "quantity": inv["quantity"],
                "item": item,
                "is_equipped": is_eq,
                "equipped_slot": equipped_lookup.get(item_id),
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


@router.post("/inventory/equip", response_model=EquipResponse)
def equip_item(
    payload: EquipRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # 1. Verify item ownership in inventory
    inv_entry = db.inventory.find_one({"user_id": current_user.id, "item_id": payload.item_id})
    if not inv_entry:
        raise HTTPException(status_code=404, detail="Item not found in your inventory")

    item = db.items.find_one({"id": payload.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item catalog entry not found")

    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # 2. Determine slot
    slot_raw = payload.slot or item.get("slot") or "WEAPON"
    slot = slot_raw.lower()
    if slot not in VALID_SLOTS:
        # Check item name heuristics if not explicitly tagged
        name_lower = item.get("name", "").lower()
        if "shield" in name_lower or "armor" in name_lower:
            slot = "armor"
        elif "sword" in name_lower or "blade" in name_lower:
            slot = "weapon"
        else:
            slot = "relic"

    equipped = character.get("equipped") or {"weapon": None, "armor": None, "relic": None}
    equipped[slot] = item["id"]

    db.characters.update_one(
        {"id": character["id"]},
        {"$set": {f"equipped.{slot}": item["id"]}},
    )

    # 3. Check for Iron Clad achievement (all 3 slots equipped)
    updated_char = db.characters.find_one({"id": character["id"]})
    up_equipped = updated_char.get("equipped") or {}
    if up_equipped.get("weapon") and up_equipped.get("armor") and up_equipped.get("relic"):
        db.characters.update_one(
            {"id": character["id"]},
            {"$addToSet": {"unlocked_achievements": "iron_clad"}},
        )

    _, active_perks = get_equipped_perks(db, updated_char)

    return EquipResponse(
        success=True,
        message=f"Equipped '{item['name']}' in {slot.upper()} slot!",
        equipped=up_equipped,
        active_perks=active_perks,
    )


@router.post("/inventory/unequip", response_model=EquipResponse)
def unequip_item(
    payload: UnequipRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    slot = payload.slot.lower()
    if slot not in VALID_SLOTS:
        raise HTTPException(status_code=400, detail=f"Invalid slot. Choose from: {list(VALID_SLOTS)}")

    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    db.characters.update_one(
        {"id": character["id"]},
        {"$set": {f"equipped.{slot}": None}},
    )

    updated_char = db.characters.find_one({"id": character["id"]})
    _, active_perks = get_equipped_perks(db, updated_char)

    return EquipResponse(
        success=True,
        message=f"Unequipped item from {slot.upper()} slot.",
        equipped=updated_char.get("equipped") or {"weapon": None, "armor": None, "relic": None},
        active_perks=active_perks,
    )

