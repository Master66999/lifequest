'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Character } from '@/types';
import {
  Shield,
  Compass,
  ShoppingBag,
  BarChart2,
  LogOut,
  Flame,
  Coins,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  character?: Character | null;
}

export default function Navbar({ character }: NavbarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <Shield size={14} /> },
    { href: '/campaign', label: 'Campaigns', icon: <Compass size={14} /> },
    { href: '/shop', label: 'Armory', icon: <ShoppingBag size={14} /> },
    { href: '/analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="app-container">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="LifeQuest AI Logo"
                className="w-8 h-8 rounded-lg object-cover shadow-xs border border-slate-200 group-hover:scale-105 transition-transform"
              />
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-[#090d16] group-hover:text-blue-700 transition-colors">
                  LifeQuest
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  AI
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200 shadow-2xs'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/90 font-semibold'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Player Stats & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {character && (
              <>
                {/* Mobile Compact Stats Badge (< 640px) */}
                <div className="flex sm:hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono">
                  <span className="font-extrabold text-blue-700">L{character.level}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-amber-700 font-bold flex items-center gap-0.5">
                    <Coins size={11} className="text-amber-600" />
                    {character.gold >= 1000 ? `${(character.gold / 1000).toFixed(1)}k` : character.gold}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-orange-600 font-bold flex items-center gap-0.5">
                    <Flame size={11} className="text-orange-500" />
                    {character.streak_days}d
                  </span>
                </div>

                {/* Desktop Full Stats (> 640px) */}
                <div className="hidden sm:flex items-center gap-2">
                  {/* Level Pill */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-300 text-xs">
                    <span className="text-[10px] font-mono font-bold text-slate-700">LVL</span>
                    <span className="font-mono font-extrabold text-blue-700">{character.level}</span>
                    <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${character.progress_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Gold Pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs font-mono">
                    <Coins size={13} className="text-amber-700" />
                    <span className="font-extrabold text-amber-900">{character.gold.toLocaleString()}</span>
                    <span className="text-[10px] text-amber-800 font-bold">G</span>
                  </div>

                  {/* Streak Pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-300 text-xs font-mono">
                    <Flame size={13} className="text-orange-600" />
                    <span className="font-extrabold text-orange-900">{character.streak_days}</span>
                    <span className="text-[10px] text-orange-800 font-bold">d</span>
                  </div>
                </div>
              </>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Persistent Bottom Navigation Bar on Mobile (< 768px) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[62px] ${
                isActive
                  ? 'text-blue-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all ${
                  isActive ? 'bg-blue-50 text-blue-700 scale-105 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {link.icon}
              </div>
              <span className="text-[10px] tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

