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
  attributes: Attributes | null;
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC' | 'LEGENDARY';
export type QuestStatus = 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
export type AttributeKey = 'INTELLECT' | 'STRENGTH' | 'FOCUS' | 'WISDOM' | 'CREATIVITY' | 'SOCIAL' | 'DISCIPLINE';

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
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  rarity: string;
  price: number;
  effect: string;
  icon: string;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  item: Item;
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
