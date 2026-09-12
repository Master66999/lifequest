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
          <div className="flex items-center gap-3">
            {character && (
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

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-2 shadow-md">
          {character && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-mono">
              <span className="text-slate-600">Level {character.level}</span>
              <span className="text-amber-700 font-bold">🪙 {character.gold} G</span>
              <span className="text-orange-600 font-bold">🔥 {character.streak_days}d streak</span>
            </div>
          )}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
