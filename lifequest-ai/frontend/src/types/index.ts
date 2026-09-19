// All type definitions for LIFEQUEST AI frontend

export interface User {
  id: number;
  email: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface Attributes {
  id: number;
  character_id: number;
  intellect: number;
  strength: number;
  focus: number;
  wisdom: number;
  creativity: number;
  social: number;
  discipline: number;
}

export interface Character {
  id: number;
  user_id: number;
  level: number;
  xp: number;
  gold: number;
  streak_days: number;
  max_streak: number;
  xp_in_current_level: number;
  xp_needed_for_next: number;
  progress_pct: number;
  character_class?: string;
  equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null };
  unlocked_achievements?: string[];
  active_perks?: string[];
  attributes: Attributes | null;
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC' | 'LEGENDARY';
export type QuestStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
export type AttributeKey = 'INTELLECT' | 'STRENGTH' | 'FOCUS' | 'WISDOM' | 'CREATIVITY' | 'SOCIAL' | 'DISCIPLINE';

export interface Subtask {
  id: string;
  title: string;
  estimated_minutes?: number;
  completed: boolean;
}

export interface Quest {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: Difficulty;
  estimated_minutes: number | null;
  xp_reward: number;
  gold_reward: number;
  attribute: AttributeKey | null;
  status: QuestStatus;
  due_date: string | null;
  created_at: string | null;
  completed_at: string | null;
  subtasks?: Subtask[];
}


export interface QuestCreate {
  title: string;
  description?: string;
  category?: string;
  difficulty: Difficulty;
  estimated_minutes?: number;
  xp_reward: number;
  gold_reward: number;
  attribute?: string;
  due_date?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  is_unlocked: boolean;
  unlocked_at?: string | null;
}

export interface QuestCompletionResult {
  old_xp: number;
  new_xp: number;
  xp_awarded: number;
  old_level: number;
  new_level: number;
  leveled_up: boolean;
  level_up_info: {
    old_level: number;
    new_level: number;
    levels_gained: number;
    skill_points_earned: number;
    attribute_points_earned: number;
  } | null;
  gold_awarded: number;
  new_gold: number;
  attribute: string | null;
  attribute_bonus: number;
  newly_unlocked_achievements?: Achievement[];
  perk_bonuses?: {
    xp_multiplier?: number;
    gold_multiplier?: number;
    boss_damage?: number;
    active_perk_labels?: string[];
  } | null;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  rarity: string;
  price: number;
  effect: string;
  icon: string;
  slot?: 'WEAPON' | 'ARMOR' | 'RELIC' | 'CONSUMABLE';
  perk_type?: string | null;
  perk_value?: number | null;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  item: Item;
  is_equipped?: boolean;
  equipped_slot?: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  title: string;
  icon: string;
  description: string;
  favored_attributes: string[];
  attribute_multiplier: number;
  boss_damage_multiplier: number;
  xp_multiplier: number;
  gold_multiplier: number;
}

export interface EquipResponse {
  success: boolean;
  message: string;
  equipped: { weapon?: number | null; armor?: number | null; relic?: number | null };
  active_perks: string[];
}


export interface Boss {
  id: number;
  name: string;
  total_hp: number;
  current_hp: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  hp_pct: number;
}

export interface Analytics {
  level: number;
  total_xp: number;
  total_gold: number;
  streak_days: number;
  max_streak: number;
  total_quests: number;
  quests_completed: number;
  quests_failed: number;
  completion_rate: number;
  category_xp: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  xp_timeline: Array<{ date: string; xp: number; title: string }>;
}

export interface GeneratedQuest {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  xp_reward: number;
  gold_reward: number;
  attribute: string;
  reasoning: string;
}

export interface GeneratedChapter {
  chapter_number: number;
  chapter_name: string;
  quests: GeneratedQuest[];
}

export interface CampaignResponse {
  campaign_name: string;
  campaign_description: string;
  chapters: GeneratedChapter[];
  quests_created: number;
  message: string;
}

export interface AuraResponse {
  message: string;
  suggested_action: string | null;
}

export interface AuraTip {
  tip: string;
  streak: number;
  level: number;
}

export interface DeconstructQuestResponse {
  quest_id: number;
  subtasks: Subtask[];
  message: string;
}

export interface RecoveryQuestItem {
  title: string;
  description: string;
  difficulty: Difficulty;
  estimated_minutes: number;
  xp_reward: number;
  gold_reward: number;
  attribute: string;
}

export interface RecoveryCoachResponse {
  analysis: string;
  tactical_mindset: string;
  recovery_quests: RecoveryQuestItem[];
}

