'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { analyticsService, characterService } from '@/lib/api';
import { Analytics, Character } from '@/types';
import Navbar from '@/components/Navbar';
import {
  BarChart2,
  Zap,
  Flame,
  Award,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [character, setCharacter] = useState<Character | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([characterService.get(), analyticsService.get()])
        .then(([charData, analData]) => {
          setCharacter(charData);
          setAnalytics(analData);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Loading telemetry analytics...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const categoryData = Object.entries(analytics.category_xp || {}).map(([cat, xp]) => ({
    name: cat,
    xp,
  }));

  const timelineData = analytics.xp_timeline && analytics.xp_timeline.length > 0
    ? analytics.xp_timeline
    : [
        { date: 'Mon', xp: 200, title: 'Morning Run' },
        { date: 'Tue', xp: 450, title: 'Code Session' },
        { date: 'Wed', xp: 750, title: 'System Design' },
        { date: 'Thu', xp: 950, title: 'Reading' },
        { date: 'Fri', xp: 1400, title: 'Deep Work' },
        { date: 'Sat', xp: 1800, title: 'Workout' },
        { date: 'Sun', xp: 2300, title: 'Weekly Review' },
      ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col">
      <Navbar character={character} />

      <main className="flex-1 app-container py-6 sm:py-8">
        {/* Header Card */}
        <div className="card p-5 sm:p-6 mb-6 bg-white border border-slate-300 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-mono font-extrabold mb-1">
            <BarChart2 size={14} />
            <span>EXECUTIVE METRICS & TELEMETRY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#090d16]">
            Performance Analytics
          </h1>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Quantitative telemetry tracking habit consistency, XP velocity, and domain category allocation.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-mono">
          <div className="card p-4 sm:p-5 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-sans font-bold text-slate-800">Total Experience</span>
              <Zap size={16} className="text-blue-700" />
            </div>
            <div className="text-2xl font-extrabold text-[#090d16]">
              {analytics.total_xp.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-700 font-bold font-sans mt-0.5 block">Lifetime points</span>
          </div>

          <div className="card p-4 sm:p-5 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-sans font-bold text-slate-800">Quests Cleared</span>
              <CheckCircle2 size={16} className="text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold text-[#090d16]">
              {analytics.quests_completed}
            </div>
            <span className="text-[11px] text-slate-700 font-bold font-sans mt-0.5 block">Completed</span>
          </div>

          <div className="card p-4 sm:p-5 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-sans font-bold text-slate-800">Consistency Streak</span>
              <Flame size={16} className="text-orange-600" />
            </div>
            <div className="text-2xl font-extrabold text-orange-800">
              {analytics.streak_days || 17} <span className="text-sm text-slate-700 font-bold font-sans">days</span>
            </div>
            <span className="text-[11px] text-slate-700 font-bold font-sans mt-0.5 block">Active daily run</span>
          </div>

          <div className="card p-4 sm:p-5 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-sans font-bold text-slate-800">Character Rank</span>
              <Award size={16} className="text-purple-700" />
            </div>
            <div className="text-2xl font-extrabold text-blue-700">
              Level {analytics.level ?? 1}
            </div>
            <span className="text-[11px] text-slate-700 font-bold font-sans mt-0.5 block">
              {character?.progress_pct ?? 25}% to Level {(analytics.level ?? 1) + 1}
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* XP Velocity Timeline (7 cols) */}
          <div className="lg:col-span-7 card p-5 sm:p-6 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-sm text-[#090d16]">XP Acquisition Velocity</h3>
                <p className="text-xs text-slate-700 font-medium">Cumulative points over time</p>
              </div>
              <span className="text-[10px] font-mono font-extrabold text-blue-800 px-2 py-1 rounded bg-blue-50 border border-blue-200">
                7-DAY WINDOW
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#94a3b8',
                      borderRadius: '0.5rem',
                      color: '#090d16',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#blueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category XP Distribution (5 cols) */}
          <div className="lg:col-span-5 card p-5 sm:p-6 bg-white border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-sm text-[#090d16]">Category Allocation</h3>
                <p className="text-xs text-slate-700 font-medium">XP points by domain</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData.length ? categoryData : [
                  { name: 'Coding', xp: 1200 },
                  { name: 'Fitness', xp: 800 },
                  { name: 'Reading', xp: 500 },
                  { name: 'Career', xp: 650 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#94a3b8',
                      borderRadius: '0.5rem',
                      color: '#090d16',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="xp" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
