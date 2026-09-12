'use client';

import Link from 'next/link';
import {
  Sparkles,
  Shield,
  Zap,
  Target,
  Flame,
  Coins,
  Brain,
  Award,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  BarChart2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="app-container h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="LifeQuest AI Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-xs border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-[#090d16] group-hover:text-blue-700 transition-colors">
                LifeQuest
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                PRO
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/login"
              className="font-bold text-slate-700 hover:text-[#090d16] px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-primary btn-sm px-4 shadow-sm"
            >
              Launch Platform →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="flex-1">
        <section className="relative pt-14 sm:pt-16 pb-12 app-container text-center">
          {/* Logo Crest Emblem */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white border border-slate-300 shadow-md mb-3 hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="LifeQuest AI Emblem"
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              <Sparkles size={12} />
              <span>Your Life. Your Quest. · Enterprise Gamified Productivity</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#090d16] max-w-2xl mx-auto leading-[1.18]">
            Turn daily execution into a{' '}
            <span className="text-blue-700">quantified master quest</span>.
          </h1>

          {/* Subheading */}
          <p className="text-slate-700 text-sm sm:text-base max-w-xl mx-auto mt-4 leading-relaxed font-medium">
            Gamify high-leverage habits, deep work sessions, and personal development into verified RPG quests.
            Level up 7 real-life attributes, conquer procrastination raid bosses, and receive tactical guidance from{' '}
            <span className="text-[#090d16] font-bold">AURA</span>, your AI Game Master.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <Link
              href="/dashboard"
              className="btn btn-primary text-xs sm:text-sm py-2.5 px-6 flex items-center gap-2 w-full sm:w-auto font-bold shadow-md shadow-blue-500/20"
            >
              <span>Launch Studio (Instant Demo)</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/campaign"
              className="btn btn-secondary text-xs sm:text-sm py-2.5 px-6 flex items-center gap-2 w-full sm:w-auto font-bold"
            >
              <Sparkles size={16} className="text-blue-700" />
              <span>Forge AI Campaign</span>
            </Link>
          </div>

          {/* ── Centered Card Preview HUD ── */}
          <div className="mt-12 card p-5 sm:p-6 bg-white border border-slate-300 shadow-lg text-left">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600 ml-2 font-sans font-semibold">lifequest.app/dashboard</span>
              </div>
              <span className="badge badge-cyan font-extrabold">LEVEL 1 WARRIOR</span>
            </div>

            {/* Simulated 3-col bento preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Attributes Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-800 font-bold text-[11px]">
                  <span>HERO ATTRIBUTES</span>
                  <span className="text-amber-800 font-mono font-extrabold">940 G</span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-blue-800 font-sans font-bold">Intelligence</span>
                    <span className="text-slate-950 font-extrabold">88</span>
                  </div>
                  <div className="progress-track"><div className="h-full bg-blue-700 w-[88%]" /></div>
                  <div className="flex justify-between pt-1">
                    <span className="text-emerald-800 font-sans font-bold">Focus & Flow</span>
                    <span className="text-slate-950 font-extrabold">94</span>
                  </div>
                  <div className="progress-track"><div className="h-full bg-emerald-700 w-[94%]" /></div>
                  <div className="flex justify-between pt-1">
                    <span className="text-teal-800 font-sans font-bold">Discipline</span>
                    <span className="text-slate-950 font-extrabold">83</span>
                  </div>
                  <div className="progress-track"><div className="h-full bg-teal-700 w-[83%]" /></div>
                </div>
              </div>

              {/* Active Quests */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-800 font-bold text-[11px]">
                  <span>ACTIVE OBJECTIVES</span>
                  <span className="text-orange-700 font-mono font-extrabold">17d Streak</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                    <span className="font-bold text-[#090d16]">System Architecture Doc</span>
                    <span className="font-mono text-blue-800 text-xs font-extrabold">+250 XP</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-2xs">
                    <span className="font-bold text-[#090d16]">Morning 5km Run</span>
                    <span className="font-mono text-emerald-800 text-xs font-extrabold">+50 XP</span>
                  </div>
                </div>
              </div>

              {/* Boss Raid */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/90 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-800 font-bold text-[11px]">
                  <span className="text-rose-800 font-extrabold">WEEKLY RAID BOSS</span>
                  <span className="text-slate-700 font-mono font-bold">LVL 12</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#090d16]">Procrastination Demon</h4>
                  <div className="flex justify-between font-mono text-[11px] text-slate-700 mt-1 mb-1">
                    <span className="font-sans font-bold">Health</span>
                    <span className="text-rose-800 font-extrabold">420 / 1,000 HP</span>
                  </div>
                  <div className="progress-track bg-rose-100">
                    <div className="h-full bg-rose-700 w-[42%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Pillars ── */}
        <section className="py-12 app-container border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left text-xs">
            <div className="card p-5 sm:p-6 bg-white border border-slate-300 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-3.5">
                <Brain size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#090d16] mb-1.5">7 Core Life Attributes</h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                Intelligence, Strength, Focus, Wisdom, Creativity, Social, and Discipline. Completed daily tasks compound into persistent character upgrades.
              </p>
            </div>

            <div className="card p-5 sm:p-6 bg-white border border-slate-300 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-3.5">
                <MessageSquare size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#090d16] mb-1.5">AURA Procedural Engine</h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                Breaks long-term ambitious goals into multi-week campaigns, dynamic milestones, and progressive difficulty pacing.
              </p>
            </div>

            <div className="card p-5 sm:p-6 bg-white border border-slate-300 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3.5">
                <Flame size={18} />
              </div>
              <h3 className="font-extrabold text-sm text-[#090d16] mb-1.5">Weekly Boss Raids</h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                Overcome procrastination demons by checking off high-priority tasks to deal direct strike damage and earn gold bounties.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-700 font-medium">
        <p>© 2026 LIFEQUEST AI · Professional Gamified Productivity Platform</p>
      </footer>
    </div>
  );
}
