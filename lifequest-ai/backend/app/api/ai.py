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
    QUEST_DECONSTRUCT_SYSTEM,
    build_deconstruct_prompt,
    RECOVERY_COACH_SYSTEM,
    build_recovery_prompt,
)
from app.models.quest import QuestStatusEnum, DifficultyEnum
from app.schemas.ai import (
    GenerateCampaignRequest,
    AuraMessageRequest,
    GeneratedCampaignSchema,
    CampaignResponse,
    AuraResponse,
    DeconstructQuestRequest,
    DeconstructedSubtask,
    DeconstructQuestResponse,
    RecoveryCoachResponse,
    AcceptRecoveryRequest,
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

    user_prompt = build_quest_generation_prompt(
        goal=request.goal,
        timeframe=request.timeframe,
        user_level=user_level,
    )

    try:
        ai = get_ai_provider()
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

    def _sort_key(q):
        val = q.get("completed_at") or q.get("created_at")
        if isinstance(val, datetime):
            return val.timestamp()
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00")).timestamp()
            except Exception:
                return 0.0
        return 0.0

    recent = sorted(
        [q for q in all_quests if q.get("created_at") or q.get("completed_at")],
        key=_sort_key,
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

    try:
        ai = get_ai_provider()
        aura_response = await ai.generate(
            system_prompt=AURA_SYSTEM_PROMPT,
            user_prompt=context_prompt,
        )
        final_message = aura_response.strip()
    except Exception as exc:
        logger.warning(f"AURA game-master LLM call failed ({exc}), activating tactical fallback.")
        top_attribute = max(attributes_dict.items(), key=lambda item: item[1])[0] if attributes_dict else "discipline"
        pending_titles = [q.get("title") for q in recent if str(q.get("status")).upper() in ("AVAILABLE", "IN_PROGRESS")]
        target_quest = f'"{pending_titles[0]}"' if pending_titles else "a newly forged mission"
        
        final_message = (
            f"Greetings, noble Champion! While the celestial ether recalibrates, my tactical awareness of your journey remains sharp. "
            f"You stand at Level {character.get('level', 1)} with a {character.get('streak_days', 0)}-day streak, "
            f"merely {max(0, xp_to_next):,} XP from your next level breakthrough. "
            f"Your greatest attribute resonance is currently {top_attribute.title()} ({attributes_dict.get(top_attribute, 10)} pts). "
            f"To maximize your momentum today, channel your focus toward completing {target_quest}. Stay resolute, Warrior!"
        )

    return AuraResponse(
        message=final_message,
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


# ── 4. Sub-Quest Deconstructor ("Deconstruct with AURA") ──────────────────────

@router.post("/deconstruct-quest", response_model=DeconstructQuestResponse)
async def deconstruct_quest(
    request: DeconstructQuestRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    quest = db.quests.find_one({"id": request.quest_id, "user_id": current_user.id})
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    title = quest.get("title", "Active Quest")
    description = quest.get("description", "")
    difficulty = str(quest.get("difficulty", "MEDIUM"))
    estimated_minutes = int(quest.get("estimated_minutes") or 30)

    prompt = build_deconstruct_prompt(
        title=title,
        description=description,
        difficulty=difficulty,
        estimated_minutes=estimated_minutes,
    )

    subtasks_list = []
    try:
        ai = get_ai_provider()
        raw_response = await ai.generate(
            system_prompt=QUEST_DECONSTRUCT_SYSTEM,
            user_prompt=prompt,
        )
        clean_json = _extract_json(raw_response)
        parsed = json.loads(clean_json)
        raw_subtasks = parsed.get("subtasks", [])
        for idx, item in enumerate(raw_subtasks):
            subtasks_list.append(
                DeconstructedSubtask(
                    id=f"st-{request.quest_id}-{idx+1}",
                    title=str(item.get("title", f"Sub-task step {idx+1}")),
                    estimated_minutes=int(item.get("estimated_minutes", 10)),
                    completed=False,
                )
            )
    except Exception as exc:
        logger.warning(f"AI quest deconstruction fallback activated ({exc})")
        subtasks_list = [
            DeconstructedSubtask(
                id=f"st-{request.quest_id}-1",
                title="Prepare workstation and review essential reference materials",
                estimated_minutes=max(5, estimated_minutes // 4),
                completed=False,
            ),
            DeconstructedSubtask(
                id=f"st-{request.quest_id}-2",
                title=f"Execute the core implementation for: {title}",
                estimated_minutes=max(10, estimated_minutes // 2),
                completed=False,
            ),
            DeconstructedSubtask(
                id=f"st-{request.quest_id}-3",
                title="Review results, verify output quality, and log completion notes",
                estimated_minutes=max(5, estimated_minutes // 4),
                completed=False,
            ),
        ]

    # Persist generated subtasks to MongoDB quest document
    serialized_subtasks = [s.model_dump() for s in subtasks_list]
    db.quests.update_one(
        {"id": request.quest_id, "user_id": current_user.id},
        {"$set": {"subtasks": serialized_subtasks}},
    )

    return DeconstructQuestResponse(
        quest_id=request.quest_id,
        subtasks=subtasks_list,
        message=f"AURA has dismantled '{title}' into {len(subtasks_list)} tactical objectives.",
    )


# ── 5. Smart Failure & Streak Recovery Coaching ───────────────────────────────

@router.post("/recovery-coach", response_model=RecoveryCoachResponse)
async def recovery_coaching(
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    char = db.characters.find_one({"user_id": current_user.id})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    failed_count = db.quests.count_documents({
        "user_id": current_user.id,
        "status": QuestStatusEnum.FAILED.value,
    })

    user_prompt = build_recovery_prompt(
        level=char.get("level", 1),
        streak_days=char.get("streak_days", 0),
        max_streak=char.get("max_streak", 0),
        failed_count=failed_count,
    )

    try:
        ai = get_ai_provider()
        raw_response = await ai.generate(
            system_prompt=RECOVERY_COACH_SYSTEM,
            user_prompt=user_prompt,
        )
        clean_json = _extract_json(raw_response)
        parsed = json.loads(clean_json)
        return RecoveryCoachResponse(**parsed)
    except Exception as exc:
        logger.warning(f"Recovery coach AI fallback triggered: {exc}")
        return RecoveryCoachResponse(
            analysis=(
                "A stumble on the path is merely an inflection point in your saga, not its conclusion. "
                "The finest champions are defined by the speed with which they mount their comeback."
            ),
            tactical_mindset="Lower friction, establish momentum with a small victory, and let discipline resume command.",
            recovery_quests=[
                {
                    "title": "Tactical Reset: 10-Minute Desk & Queue Declutter",
                    "description": "Clear your physical workspace, close unnecessary tabs, and pick one primary target for today.",
                    "difficulty": "EASY",
                    "estimated_minutes": 10,
                    "xp_reward": 80,
                    "gold_reward": 30,
                    "attribute": "DISCIPLINE",
                },
                {
                    "title": "Reignite Momentum: 15-Minute Uninterrupted Focus Sprint",
                    "description": "Engage in 15 minutes of single-task execution on any high-priority objective without distraction.",
                    "difficulty": "EASY",
                    "estimated_minutes": 15,
                    "xp_reward": 100,
                    "gold_reward": 40,
                    "attribute": "FOCUS",
                },
            ],
        )


@router.post("/accept-recovery")
def accept_recovery_plan(
    payload: AcceptRecoveryRequest,
    db: Database = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    count = 0
    for q in payload.recovery_quests:
        quest_id = get_next_sequence_value(db, "quests")
        db.quests.insert_one({
            "id": quest_id,
            "user_id": current_user.id,
            "title": q.title,
            "description": q.description,
            "category": "Recovery Protocol",
            "difficulty": q.difficulty,
            "estimated_minutes": q.estimated_minutes,
            "xp_reward": q.xp_reward,
            "gold_reward": q.gold_reward,
            "attribute": q.attribute,
            "status": QuestStatusEnum.AVAILABLE.value,
            "created_at": now,
            "completed_at": None,
            "subtasks": [],
        })
        count += 1

    return {
        "success": True,
        "quests_added": count,
        "message": f"Recovery protocol engaged! {count} micro-quests added to your active queue.",
    }

