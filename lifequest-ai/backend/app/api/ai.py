"""
AURA AI API Endpoints.
Two major features:
  1. POST /ai/generate-campaign  — Goal → full quest campaign
  2. POST /ai/game-master        — Contextual AURA advice (analyzes real user data)

Security:
  - All endpoints require valid JWT
  - AI API key is NEVER sent to or exposed by the frontend
  - AI output is validated via Pydantic before any DB writes
  - Malformed AI JSON is caught and returns a graceful error
"""
import json
import re
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.ai.factory import get_ai_provider
from app.ai.prompts import (
    AURA_SYSTEM_PROMPT,
    QUEST_GENERATION_SYSTEM,
    build_quest_generation_prompt,
    build_aura_context_prompt,
)
from app.models.user import User
from app.models.quest import Quest, QuestStatusEnum, DifficultyEnum
from app.models.character import Character
from app.schemas.ai import (
    GenerateCampaignRequest,
    AuraMessageRequest,
    GeneratedCampaignSchema,
    GeneratedQuestSchema,
    CampaignResponse,
    AuraResponse,
)
from app.services.progression import (
    calculate_level_progress,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_json(text: str) -> str:
    """
    Strips markdown code fences if the LLM wraps its JSON in ```json ... ```.
    We try to be defensive about badly-formatted AI output.
    """
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    text = text.rstrip("`").strip()
    # Find first { to last } to isolate JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return text[start:end]
    return text


# ── 1. Campaign Generator ─────────────────────────────────────────────────────

@router.post("/generate-campaign", response_model=CampaignResponse)
async def generate_campaign(
    request: GenerateCampaignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    User submits a life goal → AURA generates a full multi-chapter campaign
    with structured quests → validated → saved to DB → returned.
    """
    character: Character = db.query(Character).filter(Character.user_id == current_user.id).first()
    user_level = character.level if character else 1

    ai = get_ai_provider()
    user_prompt = build_quest_generation_prompt(
        goal=request.goal,
        timeframe=request.timeframe,
        user_level=user_level,
    )

    # ── Call AI ───────────────────────────────────────────────────────────────
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

    # ── Parse & Validate AI output (never trust raw AI JSON) ─────────────────
    try:
        clean_json = _extract_json(raw_response)
        raw_data = json.loads(clean_json)
        campaign = GeneratedCampaignSchema.model_validate(raw_data)
    except (json.JSONDecodeError, Exception) as exc:
        logger.error(f"AI JSON parse failed: {exc}\nRaw: {raw_response[:500]}")
        raise HTTPException(
            status_code=422,
            detail="AURA generated an invalid campaign structure. Please rephrase your goal and try again.",
        )

    # ── Validate reward bounds per quest ──────────────────────────────────────
    # GeneratedQuestSchema validators already clamp rewards, but we double-check
    for chapter in campaign.chapters:
        for q in chapter.quests:
            if q.xp_reward > 700:
                q.xp_reward = 700
            if q.gold_reward > 350:
                q.gold_reward = 350

    # ── Persist to DB ─────────────────────────────────────────────────────────
    total_created = 0
    for chapter in campaign.chapters:
        for q in chapter.quests:
            db_quest = Quest(
                user_id=current_user.id,
                title=q.title,
                description=q.description,
                category=q.category,
                difficulty=DifficultyEnum(q.difficulty),
                estimated_minutes=q.estimated_minutes,
                xp_reward=q.xp_reward,
                gold_reward=q.gold_reward,
                attribute=q.attribute,
                status=QuestStatusEnum.AVAILABLE,
            )
            db.add(db_quest)
            total_created += 1

    db.commit()

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AURA analyzes the user's real stats from DB and gives personalized advice.
    The frontend sends only a message — all context is fetched server-side.
    """
    # ── Gather real user context from DB ──────────────────────────────────────
    character: Character = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    all_quests = db.query(Quest).filter(Quest.user_id == current_user.id).all()
    completed = [q for q in all_quests if q.status == QuestStatusEnum.COMPLETED]
    failed = [q for q in all_quests if q.status == QuestStatusEnum.FAILED]

    total = len(all_quests)
    completion_rate = (len(completed) / total * 100) if total > 0 else 0.0

    # Recent quests (last 10 by date, any status)
    recent = sorted(
        [q for q in all_quests if q.created_at],
        key=lambda x: x.completed_at or x.created_at,
        reverse=True,
    )[:10]

    attrs = character.attributes
    attributes_dict = {}
    if attrs:
        attributes_dict = {
            "intellect": attrs.intellect,
            "strength": attrs.strength,
            "focus": attrs.focus,
            "wisdom": attrs.wisdom,
            "creativity": attrs.creativity,
            "social": attrs.social,
            "discipline": attrs.discipline,
        }

    progress = calculate_level_progress(character.xp, character.level)
    xp_to_next = progress["xp_needed_for_next"] - progress["xp_in_current_level"]

    recent_serialized = [
        {
            "title": q.title,
            "status": q.status.value,
            "difficulty": q.difficulty.value if q.difficulty else "MEDIUM",
            "xp_reward": q.xp_reward,
        }
        for q in recent
    ]

    # ── Build context-rich prompt ─────────────────────────────────────────────
    context_prompt = build_aura_context_prompt(
        user_message=request.message,
        level=character.level,
        xp=character.xp,
        gold=character.gold,
        streak_days=character.streak_days,
        max_streak=character.max_streak,
        completed_count=len(completed),
        failed_count=len(failed),
        completion_rate=completion_rate,
        recent_quests=recent_serialized,
        attributes=attributes_dict,
        xp_to_next=max(0, xp_to_next),
    )

    # ── Call AI ───────────────────────────────────────────────────────────────
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

    # Trim and return
    aura_response = aura_response.strip()

    return AuraResponse(
        message=aura_response,
        suggested_action=f"Complete a quest to continue your {character.streak_days}-day streak!",
    )


# ── 3. Quick AURA Tip (no heavy context, for dashboard widget) ────────────────

@router.get("/aura-tip")
async def aura_quick_tip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight AURA tip for the dashboard panel.
    Uses real data but generates a shorter, snappier response.
    """
    character: Character = db.query(Character).filter(Character.user_id == current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    pending = (
        db.query(Quest)
        .filter(Quest.user_id == current_user.id, Quest.status == QuestStatusEnum.AVAILABLE)
        .limit(3)
        .all()
    )

    progress = calculate_level_progress(character.xp, character.level)
    xp_to_next = progress["xp_needed_for_next"] - progress["xp_in_current_level"]

    pending_titles = [q.title for q in pending]

    prompt = f"""
The warrior is Level {character.level} with a {character.streak_days}-day streak.
They are {xp_to_next} XP away from Level {character.level + 1}.
Their pending quests: {pending_titles}.

Give them a short, punchy Game Master tip (2-3 sentences max). 
Be specific about their XP gap and streak. End with which quest to do next.
""".strip()

    ai = get_ai_provider()
    try:
        tip = await ai.generate(system_prompt=AURA_SYSTEM_PROMPT, user_prompt=prompt)
    except Exception:
        # Graceful fallback — AURA is never silent even when AI is down
        tip = (
            f"Warrior, your {character.streak_days}-day streak burns bright! "
            f"You are {xp_to_next:,} XP from Level {character.level + 1}. "
            f"{'Complete: ' + pending_titles[0] if pending_titles else 'Forge a new quest to continue your ascent!'}"
        )

    return {"tip": tip.strip(), "streak": character.streak_days, "level": character.level}
