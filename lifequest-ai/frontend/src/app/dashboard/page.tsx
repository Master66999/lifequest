'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { characterService, questService, bossService, auraService } from '@/lib/api';
import type { Character, Quest, Boss, QuestCompletionResult, Difficulty } from '@/types';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Sparkles,
  Flame,
  Coins,
  Brain,
  Dumbbell,
  Target,
  BookOpen,
  Palette,
  Users,
  Shield,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Clock,
  ChevronRight,
  X,
  Sword,
  Send,
  Trash2,
  MessageSquare,
} from 'lucide-react';

/* ── Attribute Configuration (High-Contrast Clean) ── */
const ATTRIBUTES_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  intellect: {
    color: '#1d4ed8',
    bg: '#eff6ff',
    icon: <Brain size={13} />,
    label: 'Intelligence',
  },
  strength: {
    color: '#b91c1c',
    bg: '#fef2f2',
    icon: <Dumbbell size={13} />,
    label: 'Strength',
  },
  focus: {
    color: '#047857',
    bg: '#ecfdf5',
    icon: <Target size={13} />,
    label: 'Focus & Flow',
  },
  wisdom: {
    color: '#b45309',
    bg: '#fffbeb',
    icon: <BookOpen size={13} />,
    label: 'Wisdom',
  },
  creativity: {
    color: '#6d28d9',
    bg: '#f5f3ff',
    icon: <Palette size={13} />,
    label: 'Creativity',
  },
  social: {
    color: '#c2410c',
    bg: '#fff7ed',
    icon: <Users size={13} />,
    label: 'Social & EQ',
  },
  discipline: {
    color: '#0f766e',
    bg: '#f0fdfa',
    icon: <Shield size={13} />,
    label: 'Discipline',
  },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  EASY: { label: 'Easy', badgeClass: 'badge-emerald' },
  MEDIUM: { label: 'Medium', badgeClass: 'badge-cyan' },
  HARD: { label: 'Hard', badgeClass: 'badge-gold' },
  EPIC: { label: 'Epic', badgeClass: 'badge-purple' },
  LEGENDARY: { label: 'Legendary', badgeClass: 'badge-red' },
};

/* ── Minimalist Clean Level-Up Modal ── */
function LevelUpModal({ result, onClose }: { result: QuestCompletionResult; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-white border border-slate-300 rounded-2xl p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
          <CheckCircle2 size={24} />
        </div>

        {result.leveled_up ? (
          <>
            <span className="badge badge-cyan mb-1.5 font-bold">LEVEL UP PROMOTION</span>
            <h2 className="font-extrabold text-xl text-[#090d16]">Rank Promoted</h2>
            <div className="text-blue-700 font-mono font-extrabold text-3xl my-2">
              Level {result.new_level}
            </div>
            <p className="text-xs text-slate-600">Your real-world capabilities have scaled.</p>
          </>
        ) : (
          <>
            <h2 className="font-extrabold text-lg text-[#090d16]">Quest Completed</h2>
            <p className="text-xs text-slate-600 mt-0.5">Rewards successfully credited to dossier.</p>
          </>
        )}

        <div className="grid grid-cols-2 gap-2.5 my-5 font-mono">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-600 font-bold uppercase block font-sans">
              Experience
            </span>
            <span className="text-blue-700 font-extrabold text-lg">+{result.xp_awarded} XP</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-600 font-bold uppercase block font-sans">
              Bounty
            </span>
            <span className="text-amber-700 font-extrabold text-lg">+{result.gold_awarded} G</span>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary w-full py-2.5 text-xs">
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Clean Create Quest Modal ── */
function CreateQuestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [attribute, setAttribute] = useState('DISCIPLINE');
  const [xpReward, setXpReward] = useState(150);
  const [goldReward, setGoldReward] = useState(50);
  const [estMinutes, setEstMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    switch (d) {
      case 'EASY': setXpReward(50); setGoldReward(20); break;
      case 'MEDIUM': setXpReward(150); setGoldReward(50); break;
      case 'HARD': setXpReward(300); setGoldReward(120); break;
      case 'EPIC': setXpReward(600); setGoldReward(250); break;
      case 'LEGENDARY': setXpReward(1200); setGoldReward(500); break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await questService.create({
        title,
        description,
        category,
        difficulty,
        attribute,
        xp_reward: Number(xpReward),
        gold_reward: Number(goldReward),
        estimated_minutes: Number(estMinutes),
      });
      onCreated();
      onClose();
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white border border-slate-300 rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-sm text-[#090d16]">Create New Quest</h3>
            <p className="text-xs text-slate-600">Define an objective to add to your daily queue</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Quest Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete System Design Chapter 4"
              className="input text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Read pages 40-75 and implement key-value cache"
              className="input text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                className="input cursor-pointer font-medium text-slate-900"
              >
                <option value="EASY">Easy (50 XP)</option>
                <option value="MEDIUM">Medium (150 XP)</option>
                <option value="HARD">Hard (300 XP)</option>
                <option value="EPIC">Epic (600 XP)</option>
                <option value="LEGENDARY">Legendary (1200 XP)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Target Attribute</label>
              <select
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
                className="input cursor-pointer font-medium text-slate-900"
              >
                {Object.entries(ATTRIBUTES_CONFIG).map(([key, config]) => (
                  <option key={key} value={config.label.toUpperCase()}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 font-mono">XP</label>
              <input
                type="number"
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
                className="input font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 font-mono">Est. Min</label>
              <input
                type="number"
                value={estMinutes}
                onChange={(e) => setEstMinutes(Number(e.target.value))}
                className="input font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn btn-primary flex-1 py-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Quest'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface AuraChatTurn {
  sender: 'user' | 'aura';
  text: string;
}

/* ── Main Dashboard Page (Centered Studio Card Format) ── */
export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [character, setCharacter] = useState<Character | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [auraTip, setAuraTip] = useState<string>('Analyzing your combat telemetry...');
  const [auraChatMsg, setAuraChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<AuraChatTurn[]>([]);
  const [auraLoading, setAuraLoading] = useState(false);

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ACTIVE');
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completionResult, setCompletionResult] = useState<QuestCompletionResult | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [charData, questList, bossData] = await Promise.all([
        characterService.get(),
        questService.list(),
        bossService.getCurrent(),
      ]);
      setCharacter(charData);
      setQuests(questList);
      setBoss(bossData);
    } catch {
      // handled
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
      auraService
        .getTip()
        .then((res) => setAuraTip(res.tip))
        .catch(() => setAuraTip('Maintain daily habit consistency to compound your attribute multipliers.'));
    }
  }, [isAuthenticated, loadDashboardData]);

  const handleCompleteQuest = async (id: number) => {
    setCompletingId(id);
    try {
      const result = await questService.complete(id);
      setCompletionResult(result);
      await loadDashboardData();
    } catch {
      // handled
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteQuest = async (id: number) => {
    try {
      await questService.delete(id);
      setQuests((prev) => prev.filter((q) => q.id !== id));
    } catch {
      // handled
    }
  };

  const handleSendAuraMessage = async (overrideMsg?: string) => {
    const textToSend = (overrideMsg || auraChatMsg).trim();
    if (!textToSend || auraLoading) return;
    setAuraChatMsg('');
    setChatHistory((prev) => [...prev, { sender: 'user', text: textToSend }]);
    setAuraLoading(true);
    try {
      const res = await auraService.chat(textToSend);
      setChatHistory((prev) => [...prev, { sender: 'aura', text: res.message }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'aura', text: 'AURA network connection recalibrating. Please ask again.' },
      ]);
    } finally {
      setAuraLoading(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-blue-700" />
        <p className="text-xs text-slate-600 font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  if (!character) return null;

  const filteredQuests = quests.filter((q) => {
    if (filter === 'ACTIVE') return q.status === 'AVAILABLE' || q.status === 'IN_PROGRESS';
    if (filter === 'DONE') return q.status === 'COMPLETED';
    return true;
  });

  const activeCount = quests.filter(
    (q) => q.status === 'AVAILABLE' || q.status === 'IN_PROGRESS'
  ).length;
  const doneCount = quests.filter((q) => q.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col">
      <Navbar character={character} />

      {/* ── CENTERED CARD MASTER CONTAINER ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* ── Top Executive Banner Card ── */}
        <div className="card p-5 sm:p-6 mb-6 bg-white border border-slate-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Active Session · Productivity Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#090d16]">
              Welcome back, <span className="text-blue-700">Warrior</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Level {character.level} · {character.xp_in_current_level.toLocaleString()} /{' '}
              {character.xp_needed_for_next.toLocaleString()} XP ({character.progress_pct}% to Level{' '}
              {character.level + 1})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/campaign"
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-blue-700" />
              <span>Campaign Forge</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>New Quest</span>
            </button>
          </div>
        </div>

        {/* ── 12-Column Centered Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════ LEFT COLUMN (4 cols): Character Dossier & Attributes ════════ */}
          <div className="lg:col-span-4 space-y-5">
            {/* Character Dossier Card */}
            <div className="card p-5 bg-white border border-slate-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Hero Dossier
                  </span>
                  <h2 className="font-extrabold text-lg text-[#090d16] mt-0.5">
                    Level {character.level} Champion
                  </h2>
                </div>
                <div
                  className="level-ring"
                  style={{ '--pct': `${character.progress_pct}%` } as React.CSSProperties}
                >
                  <div className="level-ring-inner">
                    <span className="text-[9px] font-mono text-blue-700 font-extrabold">
                      {character.progress_pct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Line */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Level Progression</span>
                  <span className="font-mono text-blue-700 font-extrabold">{character.progress_pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${character.progress_pct}%` }} />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-extrabold text-sm text-amber-700">
                    {character.gold.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-sans font-bold text-slate-600 uppercase mt-0.5">
                    Gold
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-extrabold text-sm text-orange-700 flex items-center justify-center gap-1">
                    {character.streak_days}d <Flame size={12} />
                  </div>
                  <div className="text-[10px] font-sans font-bold text-slate-600 uppercase mt-0.5">
                    Streak
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-extrabold text-sm text-emerald-700">
                    {doneCount}
                  </div>
                  <div className="text-[10px] font-sans font-bold text-slate-600 uppercase mt-0.5">
                    Done
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes Card */}
            <div className="card p-4 sm:p-5 bg-white border border-slate-300">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  Life Attributes
                </h3>
                <span className="text-[10px] font-mono font-bold text-slate-700">0–100 Rating</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(ATTRIBUTES_CONFIG).map(([key, cfg]) => {
                  const statVal =
                    (character.attributes as unknown as Record<string, number>)?.[key] || 50;
                  return (
                    <div key={key} className="p-2 rounded-lg bg-slate-50 border border-slate-200/90 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold truncate">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <span className="truncate text-[11px]">{cfg.label}</span>
                        </div>
                        <span className="font-mono text-[11px] font-extrabold text-slate-950 shrink-0">
                          {statVal}
                        </span>
                      </div>
                      <div className="progress-track h-1.5 bg-slate-200">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${statVal}%`,
                            backgroundColor: cfg.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boss Encounter Card */}
            {boss && (
              <div className="card p-5 bg-gradient-to-br from-rose-50/70 to-white border border-rose-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-red font-bold">WEEKLY RAID BOSS</span>
                  <span className="text-[10px] font-mono text-slate-600 font-bold">ENCOUNTER</span>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-xl shrink-0">
                    👹
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#090d16]">{boss.name}</h4>
                    <p className="text-xs text-slate-600">
                      Completed tasks deal direct damage to the raid boss.
                    </p>
                  </div>
                </div>

                <div className="space-y-1 mt-2.5 pt-2 border-t border-rose-100">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-600 font-sans font-bold">Boss Health</span>
                    <span className="text-rose-700 font-extrabold">
                      {boss.current_hp.toLocaleString()} / {boss.total_hp.toLocaleString()} HP
                    </span>
                  </div>
                  <div className="progress-track bg-rose-100">
                    <div
                      className="h-full bg-rose-600 rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, (boss.current_hp / boss.total_hp) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ════════ RIGHT COLUMN (8 cols): Quest Hub & AURA ════════ */}
          <div className="lg:col-span-8 space-y-5">
            {/* AURA AI Assistant Card */}
            <div className="card p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-white to-white border border-blue-200 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageSquare size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
                      <span>AURA · AI Game Master</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-blue-700 px-1.5 py-0.5 rounded bg-blue-100/70 border border-blue-200">
                        GPT-4o
                      </span>
                    </div>

                    {chatHistory.length > 0 && (
                      <button
                        onClick={() => setChatHistory([])}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Clear Thread
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 mt-1 leading-relaxed italic font-medium">
                    &ldquo;{auraTip}&rdquo;
                  </p>

                  {/* Multi-turn Chat Thread */}
                  {chatHistory.length > 0 && (
                    <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
                      {chatHistory.map((turn, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-2.5 rounded-xl leading-relaxed ${
                            turn.sender === 'user'
                              ? 'bg-blue-700 text-white ml-6 text-right font-medium'
                              : 'bg-white border border-slate-200 text-slate-900 mr-4 font-normal shadow-2xs'
                          }`}
                        >
                          {turn.sender === 'aura' && (
                            <span className="font-bold text-blue-800 block text-[10px] uppercase mb-0.5 font-mono">
                              AURA Strategy:
                            </span>
                          )}
                          <span>{turn.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Quick Tactical Prompt Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[
                      { label: '🎯 Prioritize queue', prompt: 'Analyze my active quests and tell me which one I should execute first for maximum leverage.' },
                      { label: '👹 Boss raid tactic', prompt: 'Give me a combat tactic to deal heavy damage to the Procrastination Demon today.' },
                      { label: '⚡ Fast XP gain', prompt: 'What is the fastest way for me to gain XP and reach the next level today?' },
                      { label: '🧘 Boost Focus & Flow', prompt: 'How do I raise my Focus & Flow life attribute through my daily quests?' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleSendAuraMessage(chip.prompt)}
                        disabled={auraLoading}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-800 hover:text-blue-800 hover:border-blue-300 transition-all font-semibold shadow-2xs"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Input row */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={auraChatMsg}
                      onChange={(e) => setAuraChatMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendAuraMessage()}
                      placeholder="Ask AURA for tactical prioritization advice..."
                      className="input text-xs py-1.5 text-slate-900 font-medium"
                    />
                    <button
                      onClick={() => handleSendAuraMessage()}
                      disabled={auraLoading || !auraChatMsg.trim()}
                      className="btn btn-primary px-3 py-1.5 text-xs shrink-0"
                    >
                      {auraLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Quest Hub Card */}
            <div className="card bg-white border border-slate-300 overflow-hidden">
              {/* Filter Tabs Bar */}
              <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilter('ACTIVE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      filter === 'ACTIVE'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                        : 'text-slate-600 hover:text-[#090d16]'
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    onClick={() => setFilter('DONE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      filter === 'DONE'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                        : 'text-slate-600 hover:text-[#090d16]'
                    }`}
                  >
                    Completed ({doneCount})
                  </button>
                  <button
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      filter === 'ALL'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                        : 'text-slate-600 hover:text-[#090d16]'
                    }`}
                  >
                    All ({quests.length})
                  </button>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <Plus size={13} /> New Quest
                </button>
              </div>

              {/* Quest Rows with Clean Scroll Height to Fit Content */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                <AnimatePresence>
                  {filteredQuests.length === 0 ? (
                    <div className="py-14 text-center">
                      <Sword size={22} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No quests under this filter.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-secondary btn-sm mt-3"
                      >
                        Create Quest
                      </button>
                    </div>
                  ) : (
                    filteredQuests.map((quest) => {
                      const isCompleted = quest.status === 'COMPLETED';
                      const isCompleting = completingId === quest.id;
                      const diffInfo =
                        DIFFICULTY_CONFIG[quest.difficulty.toUpperCase()] ||
                        DIFFICULTY_CONFIG.MEDIUM;

                      return (
                        <motion.div
                          key={quest.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`group p-3.5 flex items-center gap-3.5 transition-colors ${
                            isCompleted ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => !isCompleted && handleCompleteQuest(quest.id)}
                            disabled={isCompleted || isCompleting}
                            className="text-slate-400 hover:text-blue-700 transition-colors shrink-0"
                            title={isCompleted ? 'Completed' : 'Mark Completed'}
                          >
                            {isCompleting ? (
                              <Loader2 size={18} className="animate-spin text-blue-700" />
                            ) : isCompleted ? (
                              <CheckCircle2 size={18} className="text-emerald-700" />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`badge ${diffInfo.badgeClass}`}>
                                {diffInfo.label}
                              </span>
                              <span className="text-[11px] font-bold text-slate-600 px-2 py-0.5 rounded bg-slate-100">
                                {quest.category}
                              </span>
                              {quest.attribute && (
                                <span className="text-[11px] font-bold text-slate-600">
                                  +{quest.attribute}
                                </span>
                              )}
                            </div>

                            <h4
                              className={`text-xs font-bold text-[#090d16] truncate ${
                                isCompleted ? 'line-through text-slate-500' : ''
                              }`}
                            >
                              {quest.title}
                            </h4>

                            {quest.description && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                                {quest.description}
                              </p>
                            )}
                          </div>

                          {/* Rewards & Meta */}
                          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                            {quest.estimated_minutes && (
                              <span className="hidden sm:flex items-center gap-1 text-slate-500 font-sans font-medium">
                                <Clock size={11} /> {quest.estimated_minutes}m
                              </span>
                            )}
                            <span className="text-blue-800 font-extrabold">+{quest.xp_reward} XP</span>
                            <span className="text-amber-800 font-extrabold">+{quest.gold_reward} G</span>

                            {/* Delete Action */}
                            <button
                              onClick={() => handleDeleteQuest(quest.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Campaign Forge Prompt Card */}
            <Link
              href="/campaign"
              className="card p-4 sm:p-5 bg-white border border-slate-300 hover:border-blue-400 flex items-center justify-between gap-4 group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#090d16]">
                    Need a structured multi-phase campaign?
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Describe any long-term ambition to AURA to generate calibrated chapters and milestones.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
                <span>Enter Forge</span>
                <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Completion Modal */}
      <AnimatePresence>
        {completionResult && (
          <LevelUpModal
            result={completionResult}
            onClose={() => setCompletionResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Quest Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateQuestModal
            onClose={() => setShowCreateModal(false)}
            onCreated={loadDashboardData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
