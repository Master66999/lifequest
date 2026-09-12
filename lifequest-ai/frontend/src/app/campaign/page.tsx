'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auraService, characterService, questService } from '@/lib/api';
import { CampaignResponse, Character, Difficulty, GeneratedQuest } from '@/types';
import Navbar from '@/components/Navbar';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers,
  Compass,
  Info,
} from 'lucide-react';

const SUGGESTIONS = [
  'Master Data Science & Machine Learning in 3 months',
  'Lose 8kg and build 5km running endurance',
  'Build and launch a Full-Stack AI SaaS in 60 days',
  'Read 12 high-impact books and implement 3 habits',
];

export default function CampaignPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [character, setCharacter] = useState<Character | null>(null);
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('3 months');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [error, setError] = useState('');
  const [addedQuests, setAddedQuests] = useState<Record<string, boolean>>({});
  const [addingAll, setAddingAll] = useState(false);
  const [allAddedMessage, setAllAddedMessage] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
    if (isAuthenticated) {
      characterService.get().then(setCharacter).catch(() => {});
    }
  }, [isAuthenticated, authLoading, router]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError('');
    setCampaign(null);
    setAddedQuests({});
    setAllAddedMessage(false);

    try {
      const result = await auraService.generateCampaign(goal, timeframe);
      setCampaign(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(
        msg || 'AURA encountered network latency. Check your AI key or try another prompt.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestToLog = async (q: GeneratedQuest, key: string) => {
    try {
      await questService.create({
        title: q.title,
        description: q.description || '',
        category: q.category || 'Campaign',
        difficulty: q.difficulty as Difficulty,
        attribute: q.attribute || 'DISCIPLINE',
        xp_reward: q.xp_reward,
        gold_reward: q.gold_reward,
        estimated_minutes: q.estimated_minutes || 30,
      });
      setAddedQuests((prev) => ({ ...prev, [key]: true }));
    } catch {
      // handled
    }
  };

  const handleAddAllQuests = async () => {
    if (!campaign?.chapters) return;
    setAddingAll(true);
    try {
      const newAdded: Record<string, boolean> = { ...addedQuests };
      for (let cIdx = 0; cIdx < campaign.chapters.length; cIdx++) {
        const ch = campaign.chapters[cIdx];
        for (let qIdx = 0; qIdx < ch.quests.length; qIdx++) {
          const q = ch.quests[qIdx];
          const key = `${cIdx}-${qIdx}`;
          if (!newAdded[key]) {
            await questService.create({
              title: q.title,
              description: q.description || `Chapter ${cIdx + 1}: ${ch.chapter_name}`,
              category: campaign.campaign_name || 'Campaign',
              difficulty: q.difficulty as Difficulty,
              attribute: q.attribute || 'DISCIPLINE',
              xp_reward: q.xp_reward,
              gold_reward: q.gold_reward,
              estimated_minutes: q.estimated_minutes || 30,
            });
            newAdded[key] = true;
          }
        }
      }
      setAddedQuests(newAdded);
      setAllAddedMessage(true);
    } catch {
      // handled
    } finally {
      setAddingAll(false);
    }
  };

  const totalXp = campaign?.chapters?.reduce(
    (acc, ch) => acc + ch.quests.reduce((qAcc, q) => qAcc + (q.xp_reward || 0), 0),
    0
  ) || 0;

  const totalGold = campaign?.chapters?.reduce(
    (acc, ch) => acc + ch.quests.reduce((qAcc, q) => qAcc + (q.gold_reward || 0), 0),
    0
  ) || 0;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col">
      <Navbar character={character} />

      {/* ── CENTERED MASTER CONTAINER ── */}
      <main className="flex-1 app-container py-6 sm:py-8">
        {/* Header Card */}
        <div className="card p-5 sm:p-6 mb-6 bg-white border border-slate-300 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-mono font-extrabold mb-1">
            <Compass size={14} />
            <span>AURA PROCEDURAL ENGINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#090d16]">
            Campaign Forge
          </h1>
          <p className="text-xs text-slate-700 mt-1 max-w-2xl font-medium">
            Input any real-world goal. AURA decomposes it into progressive chapters, scalable
            quests, attribute multipliers, and milestone raid encounters.
          </p>
        </div>

        {/* 12-Column Centered Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ════════ LEFT COLUMN (5 cols): Goal Form Card ════════ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-5 bg-white border border-slate-300">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-4 pb-2.5 border-b border-slate-200">
                Define Objective
              </h3>

              <form onSubmit={handleGenerate} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="goal-input" className="block font-bold text-slate-800 mb-1.5">
                    Your Goal or Ambition
                  </label>
                  <textarea
                    id="goal-input"
                    rows={4}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g., Master TypeScript & Next.js to build a production SaaS in 90 days..."
                    className="input resize-none text-slate-900 font-medium"
                    required
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Suggestions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setGoal(suggestion)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-all font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="timeframe-select" className="block font-bold text-slate-800 mb-1.5">
                    Target Timeframe
                  </label>
                  <select
                    id="timeframe-select"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="input cursor-pointer font-medium text-slate-900"
                  >
                    <option value="1 month">1 Month Sprint</option>
                    <option value="2 months">2 Months Focus</option>
                    <option value="3 months">3 Months Standard Campaign</option>
                    <option value="6 months">6 Months Semester</option>
                    <option value="1 year">1 Year Transformation</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !goal.trim()}
                  className="btn btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating Blueprint...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Forge RPG Campaign</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="card p-4 bg-white border border-slate-300 text-xs text-slate-600 flex items-start gap-3">
              <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#090d16] block mb-0.5">
                  How Campaign Forge Works
                </span>
                AURA automatically deconstructs multi-month ambitions into 3 to 5 actionable chapters, scales XP pacing, and provides directly dispatchable daily quests.
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN (7 cols): Blueprint Display Card ════════ */}
          <div className="lg:col-span-7">
            {loading ? (
              <div className="card p-10 bg-white border border-slate-300 text-center">
                <Loader2 size={24} className="animate-spin text-blue-700 mx-auto mb-3" />
                <h3 className="font-bold text-sm text-[#090d16]">Synthesizing Campaign Blueprint</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto font-medium">
                  Calculating XP pacing and chapter breakdowns for {timeframe}...
                </p>
              </div>
            ) : campaign ? (
              <div className="space-y-4">
                {/* Header Summary Card */}
                <div className="card p-5 bg-white border border-slate-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <span className="badge badge-cyan text-[10px] mb-1 font-bold">
                        ACTIVE BLUEPRINT
                      </span>
                      <h2 className="font-extrabold text-base text-[#090d16] mt-0.5">
                        {campaign.campaign_name}
                      </h2>
                    </div>

                    <button
                      onClick={handleAddAllQuests}
                      disabled={addingAll}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 self-start"
                    >
                      {addingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      <span>Add All to Log</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 mt-2.5 leading-relaxed font-medium">
                    {campaign.campaign_description}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 mt-3.5 font-mono text-xs text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-blue-800 font-extrabold text-sm">{totalXp.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-600 uppercase font-sans font-bold">
                        Total XP
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-amber-800 font-extrabold text-sm">{totalGold.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-600 uppercase font-sans font-bold">
                        Gold Rewards
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-900 font-extrabold text-sm">{campaign.chapters?.length || 0}</div>
                      <div className="text-[10px] text-slate-600 uppercase font-sans font-bold">
                        Chapters
                      </div>
                    </div>
                  </div>

                  {allAddedMessage && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
                      <span>✓ All quests added to your dashboard!</span>
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="font-bold underline hover:text-emerald-950 ml-2"
                      >
                        Go to Dashboard →
                      </button>
                    </div>
                  )}
                </div>

                {/* Chapters List */}
                <div className="space-y-3">
                  {campaign.chapters?.map((chapter, cIdx) => (
                    <div key={cIdx} className="card p-4 bg-white border border-slate-300 space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="w-5 h-5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs flex items-center justify-center font-bold">
                          {chapter.chapter_number || cIdx + 1}
                        </span>
                        <h3 className="font-bold text-xs text-[#090d16]">
                          {chapter.chapter_name}
                        </h3>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {chapter.quests?.map((quest, qIdx) => {
                          const key = `${cIdx}-${qIdx}`;
                          const isAdded = !!addedQuests[key];
                          return (
                            <div key={qIdx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="badge badge-cyan text-[9px]">
                                    {quest.difficulty}
                                  </span>
                                  <h4 className="font-bold text-[#090d16] truncate">
                                    {quest.title}
                                  </h4>
                                </div>
                                {quest.description && (
                                  <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                                    {quest.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2.5 font-mono shrink-0">
                                <span className="text-blue-800 text-xs font-bold">
                                  +{quest.xp_reward} XP
                                </span>
                                <button
                                  onClick={() => handleAddQuestToLog(quest, key)}
                                  disabled={isAdded}
                                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                                    isAdded
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'btn btn-secondary btn-sm'
                                  }`}
                                >
                                  {isAdded ? 'Added ✓' : '+ Add'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Empty Preview */
              <div className="card p-8 bg-white border border-slate-300 text-center">
                <Layers size={24} className="text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-[#090d16]">Campaign Blueprint Canvas</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed font-medium">
                  Enter your ambition on the left and click &ldquo;Forge RPG Campaign&rdquo;. AURA will
                  output calibrated phases and milestone quests directly onto this board.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left mt-6 pt-5 border-t border-slate-200 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-[#090d16] block mb-0.5">1. Sequential Sprints</span>
                    <p className="text-[11px] text-slate-600 font-medium">Deconstructs goals into 3 to 5 logical phases.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-[#090d16] block mb-0.5">2. Scaled Bounties</span>
                    <p className="text-[11px] text-slate-600 font-medium">Scales XP and Gold according to difficulty.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-[#090d16] block mb-0.5">3. One-Click Dispatch</span>
                    <p className="text-[11px] text-slate-600 font-medium">Deploy directly into your active questline.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
