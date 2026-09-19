'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Sword, Award } from 'lucide-react';

interface CharacterAvatarProps {
  characterClass?: string;
  level?: number;
  equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadges?: boolean;
  className?: string;
}

export default function CharacterAvatar({
  characterClass = 'WARRIOR',
  level = 1,
  equipped,
  size = 'md',
  showBadges = false,
  className = '',
}: CharacterAvatarProps) {
  const normClass = (characterClass || 'WARRIOR').toUpperCase();

  // Size configurations
  const sizeConfig = {
    sm: { box: 'w-16 h-16', svgSize: 64, auraScale: 1 },
    md: { box: 'w-24 h-24', svgSize: 96, auraScale: 1.1 },
    lg: { box: 'w-32 h-32', svgSize: 128, auraScale: 1.2 },
    xl: { box: 'w-44 h-44', svgSize: 176, auraScale: 1.3 },
  }[size];

  // Level Aura Config
  const isLegendary = level >= 10;
  const isVeteran = level >= 5 && level < 10;

  const auraColor = isLegendary
    ? 'rgba(245, 158, 11, 0.45)'
    : isVeteran
    ? 'rgba(168, 85, 247, 0.4)'
    : 'rgba(59, 130, 246, 0.3)';

  const auraBorder = isLegendary
    ? 'border-amber-400'
    : isVeteran
    ? 'border-purple-400'
    : 'border-blue-400';

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Outer Glow Halo */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute rounded-full pointer-events-none blur-md ${sizeConfig.box}`}
        style={{ backgroundColor: auraColor }}
      />

      {/* Rotating Sunburst Halo for Level 10+ */}
      {isLegendary && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className={`absolute rounded-full border-2 border-dashed border-amber-400/60 pointer-events-none ${sizeConfig.box}`}
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      {/* Avatar Container Frame */}
      <motion.div
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className={`relative ${sizeConfig.box} rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border-2 ${auraBorder} shadow-lg flex items-center justify-center overflow-hidden z-10`}
      >
        {/* Class-Specific Detailed SVG Avatar */}
        {normClass === 'WARRIOR' && <WarriorAvatar equipped={equipped} />}
        {normClass === 'MAGE' && <MageAvatar equipped={equipped} />}
        {normClass === 'ROGUE' && <RogueAvatar equipped={equipped} />}
        {normClass === 'BARD' && <BardAvatar equipped={equipped} />}

        {/* Level Emblem Overlay */}
        <div className="absolute top-1 right-1 bg-slate-900/90 border border-slate-700 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded-md shadow-xs flex items-center gap-0.5">
          <span className="text-amber-400 font-sans">★</span>
          <span>{level}</span>
        </div>
      </motion.div>

      {/* Equipped Gear Badges */}
      {showBadges && (
        <div className="flex items-center gap-1 mt-2 z-10">
          <span
            title={equipped?.weapon ? 'Weapon Equipped' : 'No Weapon'}
            className={`p-1 rounded-md border text-[9px] font-mono flex items-center gap-0.5 ${
              equipped?.weapon
                ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <Sword size={10} />
            <span className="hidden sm:inline">WPN</span>
          </span>
          <span
            title={equipped?.armor ? 'Armor Equipped' : 'No Armor'}
            className={`p-1 rounded-md border text-[9px] font-mono flex items-center gap-0.5 ${
              equipped?.armor
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <Shield size={10} />
            <span className="hidden sm:inline">ARM</span>
          </span>
          <span
            title={equipped?.relic ? 'Relic Equipped' : 'No Relic'}
            className={`p-1 rounded-md border text-[9px] font-mono flex items-center gap-0.5 ${
              equipped?.relic
                ? 'bg-purple-50 text-purple-800 border-purple-300 font-bold'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <Award size={10} />
            <span className="hidden sm:inline">RLC</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Warrior Sprite Artwork ── */
function WarriorAvatar({ equipped }: { equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null } }) {
  const hasWeapon = !!equipped?.weapon;
  const hasArmor = !!equipped?.armor;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Combat Radial */}
      <circle cx="50" cy="50" r="45" fill="url(#warriorGlow)" opacity="0.25" />

      {/* Shoulder Pauldrons (Heavy Armor) */}
      <path
        d="M20 54 L34 46 L36 68 L18 64 Z"
        fill={hasArmor ? '#cbd5e1' : '#64748b'}
        stroke="#1e293b"
        strokeWidth="2"
      />
      <path
        d="M80 54 L66 46 L64 68 L82 64 Z"
        fill={hasArmor ? '#cbd5e1' : '#64748b'}
        stroke="#1e293b"
        strokeWidth="2"
      />

      {/* Plate Chest Armor */}
      <path
        d="M32 46 L68 46 L60 85 L40 85 Z"
        fill={hasArmor ? '#94a3b8' : '#475569'}
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* Golden Chest Crest */}
      <polygon points="50,52 54,60 46,60" fill="#f59e0b" />
      <line x1="50" y1="60" x2="50" y2="76" stroke="#f59e0b" strokeWidth="2" />

      {/* Knight Helm */}
      <rect x="36" y="20" width="28" height="28" rx="8" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
      {/* Helm Plume (Crimson Crest) */}
      <path d="M46 20 C46 10, 54 8, 54 20 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />

      {/* Visor Slit with Crimson Glowing Eyes */}
      <rect x="40" y="32" width="20" height="5" rx="2" fill="#0f172a" />
      <circle cx="45" cy="34.5" r="1.5" fill="#f87171" />
      <circle cx="55" cy="34.5" r="1.5" fill="#f87171" />

      {/* Equipped Greatsword on Back */}
      {hasWeapon && (
        <g transform="rotate(28 70 20)">
          <rect x="68" y="-10" width="4" height="42" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
          <rect x="64" y="24" width="12" height="3" rx="1" fill="#f59e0b" />
          <rect x="69" y="27" width="2" height="8" fill="#78350f" />
        </g>
      )}

      {/* Gradient Defs */}
      <defs>
        <radialGradient id="warriorGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ── Mage Sprite Artwork ── */
function MageAvatar({ equipped }: { equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null } }) {
  const hasWeapon = !!equipped?.weapon;
  const hasRelic = !!equipped?.relic;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arcane Background Ring */}
      <circle cx="50" cy="50" r="42" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

      {/* Arcane Robes */}
      <path
        d="M26 50 L74 50 L80 92 L20 92 Z"
        fill="#1e1b4b"
        stroke="#4338ca"
        strokeWidth="2"
      />
      {/* Golden Rune Stole */}
      <path d="M42 50 L42 90 M58 50 L58 90" stroke="#fbbf24" strokeWidth="2" />

      {/* Mystic Hood */}
      <path
        d="M32 46 C32 18, 68 18, 68 46 C60 48, 40 48, 32 46 Z"
        fill="#312e81"
        stroke="#4338ca"
        strokeWidth="2"
      />
      {/* Shadow inside Hood */}
      <ellipse cx="50" cy="36" rx="12" ry="10" fill="#090d16" />

      {/* Glowing Arcane Eyes */}
      <circle cx="45" cy="36" r="2" fill="#38bdf8" />
      <circle cx="55" cy="36" r="2" fill="#38bdf8" />

      {/* Floating Forehead Rune */}
      <polygon points="50,22 52,25 50,28 48,25" fill="#a855f7" />

      {/* Equipped Arcane Staff */}
      {hasWeapon && (
        <g>
          <line x1="82" y1="18" x2="82" y2="88" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          <circle cx="82" cy="16" r="6" fill="#38bdf8" stroke="#60a5fa" strokeWidth="1.5" />
          <circle cx="82" cy="16" r="2.5" fill="#ffffff" />
        </g>
      )}

      {/* Floating Spell Relic Orb */}
      {hasRelic && (
        <circle cx="20" cy="38" r="5" fill="#a855f7" stroke="#e9d5ff" strokeWidth="1.5">
          <animate attributeName="cy" values="36;40;36" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

/* ── Rogue Sprite Artwork ── */
function RogueAvatar({ equipped }: { equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null } }) {
  const hasWeapon = !!equipped?.weapon;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Nightfall Background Smoke */}
      <circle cx="50" cy="50" r="45" fill="#022c22" opacity="0.3" />

      {/* Shadow Cloak */}
      <path
        d="M24 48 L76 48 L85 92 L15 92 Z"
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth="2"
      />

      {/* Stealth Assassin Hood */}
      <path
        d="M30 46 C28 20, 72 20, 70 46 C60 48, 40 48, 30 46 Z"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="2"
      />
      {/* Cowl Peak */}
      <polygon points="50,14 44,22 56,22" fill="#1e293b" />

      {/* Face Scarf Mask */}
      <rect x="38" y="38" width="24" height="12" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />

      {/* Piercing Emerald Eyes */}
      <ellipse cx="44" cy="34" rx="2.5" ry="1.2" fill="#34d399" />
      <ellipse cx="56" cy="34" rx="2.5" ry="1.2" fill="#34d399" />

      {/* Equipped Poison Daggers */}
      {hasWeapon && (
        <g>
          {/* Left Dagger */}
          <path d="M18 55 L24 75 L20 76 L15 57 Z" fill="#94a3b8" stroke="#10b981" strokeWidth="1" />
          {/* Right Dagger */}
          <path d="M82 55 L76 75 L80 76 L85 57 Z" fill="#94a3b8" stroke="#10b981" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

/* ── Bard Sprite Artwork ── */
function BardAvatar({ equipped }: { equipped?: { weapon?: number | null; armor?: number | null; relic?: number | null } }) {
  const hasWeapon = !!equipped?.weapon;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Musical Background Notes */}
      <text x="18" y="30" fill="#f59e0b" fontSize="12" opacity="0.6">♪</text>
      <text x="76" y="34" fill="#ec4899" fontSize="14" opacity="0.7">♫</text>
      <text x="24" y="80" fill="#a855f7" fontSize="10" opacity="0.5">✦</text>

      {/* Velvet Doublet */}
      <path
        d="M28 48 L72 48 L76 92 L24 92 Z"
        fill="#831843"
        stroke="#db2777"
        strokeWidth="2"
      />
      <line x1="50" y1="48" x2="50" y2="92" stroke="#fbcfe8" strokeWidth="2" strokeDasharray="3 3" />

      {/* Beret with Feather */}
      <ellipse cx="50" cy="30" rx="22" ry="10" fill="#be185d" stroke="#f472b6" strokeWidth="2" />
      <path d="M32 26 Q20 10 14 16 Q24 24 34 26" fill="#f59e0b" />

      {/* Friendly Bard Face */}
      <ellipse cx="50" cy="38" rx="13" ry="11" fill="#fde047" opacity="0.85" />
      {/* Expressive Eyes & Smile */}
      <circle cx="45" cy="36" r="1.5" fill="#1e293b" />
      <circle cx="55" cy="36" r="1.5" fill="#1e293b" />
      <path d="M46 42 Q50 46 54 42" stroke="#1e293b" strokeWidth="1.5" fill="none" />

      {/* Equipped Ornate Lute */}
      {hasWeapon && (
        <g transform="translate(62, 50)">
          <ellipse cx="14" cy="22" rx="10" ry="14" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="14" cy="22" r="4" fill="#451a03" />
          <rect x="12" y="-4" width="4" height="18" fill="#b45309" stroke="#78350f" strokeWidth="1" />
          <line x1="13" y1="0" x2="13" y2="28" stroke="#fef3c7" strokeWidth="0.8" />
          <line x1="15" y1="0" x2="15" y2="28" stroke="#fef3c7" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  );
}
