import json
import re
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.core.database import get_db, get_next_sequence_value
from app.api.deps import get_current_user, CurrentUser
from app.ai.factory import get_ai_provider
from app.ai.prompts import (
    AURA_SYSTEM_PROMPT,
    QUEST_GENERATION_SYSTEM,
    build_quest_generation_prompt,
    build_aura_context_prompt,
)
from app.models.quest import QuestStatusEnum, DifficultyEnum
from app.schemas.ai import (
    GenerateCampaignRequest,
    AuraMessageRequest,
    GeneratedCampaignSchema,
    CampaignResponse,
    AuraResponse,
)
from app.services.progression import calculate_level_progress

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_json(text: str) -> str:
    """Strips markdown code fences if LLM wraps JSON in ```json ... ```."""
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    text = text.rstrip("`").strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return text[start:end]
    return text


# ── 1. Campaign Generator ─────────────────────────────────────────────────────

@router.post("/generate-campaign", response_model=CampaignResponse)
async def generate_campaign(
    request: GenerateCampaignRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    character = db.characters.find_one({"user_id": current_user.id})
    user_level = character.get("level", 1) if character else 1

    ai = get_ai_provider()
    user_prompt = build_quest_generation_prompt(
        goal=request.goal,
        timeframe=request.timeframe,
        user_level=user_level,
    )

    try:
        raw_response = await ai.generate(
            system_prompt=QUEST_GENERATION_SYSTEM,
            user_prompt=user_prompt,
        )
    except Exception as exc:
        logger.error(f"AI generation failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="AURA is temporarily unavailable. Please try again in a moment.",
        )

    try:
        clean_json = _extract_json(raw_response)
        raw_data = json.loads(clean_json)
        campaign = GeneratedCampaignSchema.model_validate(raw_data)
    except Exception as exc:
        logger.error(f"AI JSON parse failed: {exc}\nRaw: {raw_response[:500]}")
        raise HTTPException(
            status_code=422,
            detail="AURA generated an invalid campaign structure. Please rephrase your goal and try again.",
        )

    # Validate reward bounds per quest
    for chapter in campaign.chapters:
        for q in chapter.quests:
            if q.xp_reward > 700:
                q.xp_reward = 700
            if q.gold_reward > 350:
                q.gold_reward = 350

    # Persist to MongoDB
    now = datetime.now(timezone.utc)
    total_created = 0
    for chapter in campaign.chapters:
        for q in chapter.quests:
            quest_id = get_next_sequence_value(db, "quests")
            quest_doc = {
                "id": quest_id,
                "user_id": current_user.id,
                "title": q.title,
                "description": q.description,
                "category": q.category,
                "difficulty": q.difficulty if isinstance(q.difficulty, str) else q.difficulty.value,
                "estimated_minutes": q.estimated_minutes,
                "xp_reward": q.xp_reward,
                "gold_reward": q.gold_reward,
                "attribute": q.attribute,
                "status": QuestStatusEnum.AVAILABLE.value,
                "created_at": now,
                "completed_at": None,
            }
            db.quests.insert_one(quest_doc)
            total_created += 1

    return CampaignResponse(
        campaign_name=campaign.campaign_name,
        campaign_description=campaign.campaign_description,
        chapters=campaign.chapters,
        quests_created=total_created,
        message=f"AURA has forged your destiny! {total_created} quests across {len(campaign.chapters)} chapters await you.",
    )


# ── 2. AURA Game Master ───────────────────────────────────────────────────────

@router.post("/game-master", response_model=AuraResponse)
async def aura_game_master(
    request: AuraMessageRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    all_quests = list(db.quests.find({"user_id": current_user.id}))
    completed = [q for q in all_quests if q.get("status") in (QuestStatusEnum.COMPLETED.value, "COMPLETED")]
    failed = [q for q in all_quests if q.get("status") in (QuestStatusEnum.FAILED.value, "FAILED")]

    total = len(all_quests)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0.0

    recent = sorted(
        [q for q in all_quests if q.get("created_at")],
        key=lambda x: x.get("completed_at") or x.get("created_at") or 0,
        reverse=True,
    )[:10]

    attrs = db.attributes.find_one({"character_id": character["id"]}) or {}
    attributes_dict = {
        "intellect": attrs.get("intellect", 10),
        "strength": attrs.get("strength", 10),
        "focus": attrs.get("focus", 10),
        "wisdom": attrs.get("wisdom", 10),
        "creativity": attrs.get("creativity", 10),
        "social": attrs.get("social", 10),
        "discipline": attrs.get("discipline", 10),
    }

    progress = calculate_level_progress(character.get("xp", 0), character.get("level", 1))
    xp_to_next = progress["xp_needed_for_next"] - progress["xp_in_current_level"]

    recent_serialized = [
        {
            "title": q.get("title", ""),
            "status": str(q.get("status", "AVAILABLE")),
            "difficulty": str(q.get("difficulty", "MEDIUM")),
            "xp_reward": q.get("xp_reward", 0),
        }
        for q in recent
    ]

    context_prompt = build_aura_context_prompt(
        user_message=request.message,
        level=character.get("level", 1),
        xp=character.get("xp", 0),
        gold=character.get("gold", 0),
        streak_days=character.get("streak_days", 0),
        max_streak=character.get("max_streak", 0),
        completed_count=len(completed),
        failed_count=len(failed),
        completion_rate=completion_rate,
        recent_quests=recent_serialized,
        attributes=attributes_dict,
        xp_to_next=max(0, xp_to_next),
    )

    ai = get_ai_provider()
    try:
        aura_response = await ai.generate(
            system_prompt=AURA_SYSTEM_PROMPT,
            user_prompt=context_prompt,
        )
    except Exception as exc:
        logger.error(f"AURA game-master failed: {exc}")
        raise HTTPException(
            status_code=503,
            detail="AURA is temporarily meditating. Please try again shortly.",
        )

    return AuraResponse(
        message=aura_response.strip(),
        suggested_action=f"Complete a quest to continue your {character.get('streak_days', 0)}-day streak!",
    )


# ── 3. Quick AURA Tip ─────────────────────────────────────────────────────────

@router.get("/aura-tip")
async def aura_quick_tip(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    character = db.characters.find_one({"user_id": current_user.id})
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    pending_cursor = db.quests.find(
        {"user_id": current_user.id, "status": QuestStatusEnum.AVAILABLE.value}
    ).limit(3)
    pending = list(pending_cursor)

    progress = calculate_level_progress(character.get("xp", 0), character.get("level", 1))
    xp_to_next = progress["xp_needed_for_next"] - progress["xp_in_current_level"]

    pending_titles = [q.get("title", "") for q in pending]

    prompt = f"""
The warrior is Level {character.get('level', 1)} with a {character.get('streak_days', 0)}-day streak.
They are {xp_to_next} XP away from Level {character.get('level', 1) + 1}.
Their pending quests: {pending_titles}.

Give them a short, punchy Game Master tip (2-3 sentences max). 
Be specific about their XP gap and streak. End with which quest to do next.
""".strip()

    ai = get_ai_provider()
    try:
        tip = await ai.generate(system_prompt=AURA_SYSTEM_PROMPT, user_prompt=prompt)
    except Exception:
        first_title = pending_titles[0] if pending_titles else "Forge a new quest to continue your ascent!"
        tip = (
            f"Warrior, your {character.get('streak_days', 0)}-day streak burns bright! "
            f"You are {xp_to_next:,} XP from Level {character.get('level', 1) + 1}. "
            f"Complete: {first_title}"
        )

    return {
        "tip": tip.strip(),
        "streak": character.get("streak_days", 0),
        "level": character.get("level", 1),
    }
