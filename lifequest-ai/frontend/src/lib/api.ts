// API service layer — all requests go through here, never from components directly.
// API key is NEVER sent here; auth is JWT Bearer token stored in memory/cookie.

import axios, { AxiosError } from 'axios';
import type {
  AuthToken, Character, Quest, QuestCreate, QuestCompletionResult,
  Item, InventoryItem, Boss, Analytics, CampaignResponse, AuraResponse, AuraTip
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

// Inject JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lq_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authService = {
  async register(email: string, password: string): Promise<{ id: number; email: string }> {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthToken> {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lq_token');
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('lq_token');
  },
};

// ── Character ─────────────────────────────────────────────────────────────────

export const characterService = {
  async get(): Promise<Character> {
    const res = await api.get('/character/');
    return res.data;
  },

  async chooseClass(character_class: string): Promise<Character> {
    const res = await api.post('/character/choose-class', { character_class });
    return res.data;
  },

  async getClasses(): Promise<import('@/types').ClassInfo[]> {
    const res = await api.get('/character/classes');
    return res.data;
  },

  async getAchievements(): Promise<import('@/types').Achievement[]> {
    const res = await api.get('/character/achievements');
    return res.data;
  },
};

// ── Quests ────────────────────────────────────────────────────────────────────

export const questService = {
  async list(): Promise<Quest[]> {
    const res = await api.get('/quests/');
    return res.data;
  },

  async create(quest: QuestCreate): Promise<Quest> {
    const res = await api.post('/quests/', quest);
    return res.data;
  },

  async update(id: number, data: Partial<QuestCreate>): Promise<Quest> {
    const res = await api.put(`/quests/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/quests/${id}`);
  },

  async complete(id: number): Promise<QuestCompletionResult> {
    const res = await api.post(`/quests/${id}/complete`);
    return res.data;
  },

  async toggleSubtask(questId: number, subtaskId: string): Promise<Quest> {
    const res = await api.post(`/quests/${questId}/subtasks/${subtaskId}/toggle`);
    return res.data;
  },
};

// ── Shop & Inventory ──────────────────────────────────────────────────────────

export const shopService = {
  async getShop(): Promise<Item[]> {
    const res = await api.get('/shop');
    return res.data;
  },

  async getInventory(): Promise<InventoryItem[]> {
    const res = await api.get('/inventory');
    return res.data;
  },

  async purchase(item_id: number): Promise<{ success: boolean; item_name: string; gold_spent: number; remaining_gold: number; message: string }> {
    const res = await api.post('/inventory/purchase', { item_id });
    return res.data;
  },

  async equip(item_id: number, slot?: string): Promise<import('@/types').EquipResponse> {
    const res = await api.post('/inventory/equip', { item_id, slot });
    return res.data;
  },

  async unequip(slot: string): Promise<import('@/types').EquipResponse> {
    const res = await api.post('/inventory/unequip', { slot });
    return res.data;
  },
};


// ── Boss ──────────────────────────────────────────────────────────────────────

export const bossService = {
  async getCurrent(): Promise<Boss | null> {
    const res = await api.get('/boss/current');
    return res.data;
  },

  async damage(id: number, damage: number): Promise<Boss> {
    const res = await api.post(`/boss/${id}/damage?damage=${damage}`);
    return res.data;
  },
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsService = {
  async get(): Promise<Analytics> {
    const res = await api.get('/analytics/');
    return res.data;
  },
};

// ── AURA AI ───────────────────────────────────────────────────────────────────

export const auraService = {
  async generateCampaign(goal: string, timeframe: string): Promise<CampaignResponse> {
    const res = await api.post('/ai/generate-campaign', { goal, timeframe });
    return res.data;
  },

  async chat(message: string): Promise<AuraResponse> {
    const res = await api.post('/ai/game-master', { message });
    return res.data;
  },

  async getTip(): Promise<AuraTip> {
    const res = await api.get('/ai/aura-tip');
    return res.data;
  },

  async deconstructQuest(questId: number): Promise<import('@/types').DeconstructQuestResponse> {
    const res = await api.post('/ai/deconstruct-quest', { quest_id: questId });
    return res.data;
  },

  async getRecoveryPlan(): Promise<import('@/types').RecoveryCoachResponse> {
    const res = await api.post('/ai/recovery-coach');
    return res.data;
  },

  async acceptRecoveryPlan(recoveryQuests: import('@/types').RecoveryQuestItem[]): Promise<{ success: boolean; quests_added: number; message: string }> {
    const res = await api.post('/ai/accept-recovery', { recovery_quests: recoveryQuests });
    return res.data;
  },
};

export default api;

