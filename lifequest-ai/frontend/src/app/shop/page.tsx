'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { shopService, characterService } from '@/lib/api';
import { Item, InventoryItem, Character } from '@/types';
import Navbar from '@/components/Navbar';
import CharacterAvatar from '@/components/CharacterAvatar';
import { soundEffects } from '@/lib/sound-effects';
import {
  ShoppingBag,
  Package,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sword,
  Sparkles,
  Zap,
} from 'lucide-react';

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

const RARITY_STYLES: Record<string, { badge: string; border: string }> = {
  LEGENDARY: { badge: 'badge-gold', border: 'border-amber-300' },
  EPIC: { badge: 'badge-purple', border: 'border-purple-300' },
  RARE: { badge: 'badge-cyan', border: 'border-blue-300' },
  UNCOMMON: { badge: 'badge-emerald', border: 'border-emerald-300' },
  COMMON: { badge: 'border-slate-300 bg-slate-100 text-slate-700 font-bold', border: 'border-slate-300' },
};

export default function ShopPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [character, setCharacter] = useState<Character | null>(null);
  const [shop, setShop] = useState<Item[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [equippingSlot, setEquippingSlot] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  const loadData = async () => {
    try {
      const [charData, shopItems, invItems] = await Promise.all([
        characterService.get(),
        shopService.getShop(),
        shopService.getInventory(),
      ]);
      setCharacter(charData);
      setShop(
        shopItems.sort(
          (a, b) =>
            RARITY_ORDER.indexOf(a.rarity.toUpperCase()) -
            RARITY_ORDER.indexOf(b.rarity.toUpperCase())
        )
      );
      setInventory(invItems);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  const handlePurchase = async (itemId: number) => {
    setBuyingId(itemId);
    setNotification(null);
    try {
      const res = await shopService.purchase(itemId);
      soundEffects.playCoinClink();
      setNotification({ text: `Acquired ${res.item_name}. Added to inventory.`, type: 'success' });
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setNotification({
        text: msg || 'Purchase error. Insufficient gold or item already acquired.',
        type: 'error',
      });
    } finally {
      setBuyingId(null);
    }
  };

  const handleEquip = async (itemId: number, slot?: string) => {
    setEquippingSlot(slot || 'item');
    setNotification(null);
    try {
      const res = await shopService.equip(itemId, slot);
      soundEffects.playEquip();
      setNotification({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setNotification({ text: msg || 'Failed to equip item.', type: 'error' });
    } finally {
      setEquippingSlot(null);
    }
  };

  const handleUnequip = async (slot: string) => {
    setEquippingSlot(slot);
    setNotification(null);
    try {
      const res = await shopService.unequip(slot);
      soundEffects.playEquip();
      setNotification({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setNotification({ text: msg || 'Failed to unequip item.', type: 'error' });
    } finally {
      setEquippingSlot(null);
    }
  };

  const ownedItemIds = new Set(inventory.map((inv) => inv.item_id));

  // Find equipped items
  const equippedWeapon = inventory.find((i) => i.item_id === character?.equipped?.weapon)?.item;
  const equippedArmor = inventory.find((i) => i.item_id === character?.equipped?.armor)?.item;
  const equippedRelic = inventory.find((i) => i.item_id === character?.equipped?.relic)?.item;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col">
      <Navbar character={character} />

      {/* ── CENTERED MASTER CONTAINER ── */}
      <main className="flex-1 app-container py-4 sm:py-8 pb-24 md:pb-8">
        {/* Header Card */}
        <div className="card p-4 sm:p-6 mb-5 sm:mb-6 bg-white border border-slate-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-mono font-extrabold mb-1">
              <ShoppingBag size={14} />
              <span>EQUIPMENT ARMORY & LOADOUT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#090d16]">
              Armory & Gear Loadout
            </h1>
            <p className="text-xs text-slate-700 mt-0.5 font-medium">
              Acquire weapons, armor, and relics. Equip gear to activate passive XP, Boss Damage, and Streak Shield perks.
            </p>
          </div>

          {character && (
            <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-amber-300 font-mono text-xs shadow-xs">
              <Coins size={15} className="text-amber-700" />
              <span className="text-slate-600 font-sans font-semibold">Treasury:</span>
              <span className="font-extrabold text-amber-800 text-sm">{character.gold.toLocaleString()} G</span>
            </div>
          )}
        </div>

        {/* Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-5 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-700" />
                ) : (
                  <AlertCircle size={16} className="text-red-700" />
                )}
                <span>{notification.text}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-900">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── EQUIPMENT LOADOUT PAPERDOLL ── */}
        <div className="card p-5 mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md border border-slate-700">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <CharacterAvatar
                characterClass={character?.character_class}
                level={character?.level}
                equipped={character?.equipped}
                size="md"
                showBadges={false}
              />
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono mb-0.5">
                  <Shield size={14} />
                  <span>ACTIVE EQUIPMENT LOADOUT</span>
                </div>
                <h2 className="text-lg font-extrabold tracking-tight">
                  {character?.character_class || 'WARRIOR'} Battle Gear
                </h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Level {character?.level || 1} Champion · Dynamic visualizer updates when loadout changes
                </p>
              </div>
            </div>

            {character?.active_perks && character.active_perks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {character.active_perks.map((perk, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                  >
                    <Zap size={11} className="text-emerald-400" />
                    {perk}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WEAPON SLOT */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700/80 flex items-center justify-center text-2xl border border-slate-600">
                  {equippedWeapon?.icon || '⚔️'}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    WEAPON SLOT
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    {equippedWeapon?.name || 'Empty Slot'}
                  </div>
                  <div className="text-xs text-amber-300 font-medium">
                    {equippedWeapon ? equippedWeapon.description : 'Equip a weapon from inventory'}
                  </div>
                </div>
              </div>
              {equippedWeapon && (
                <button
                  onClick={() => handleUnequip('weapon')}
                  disabled={equippingSlot === 'weapon'}
                  className="btn btn-sm bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs border border-slate-600"
                >
                  {equippingSlot === 'weapon' ? <Loader2 size={12} className="animate-spin" /> : 'Unequip'}
                </button>
              )}
            </div>

            {/* ARMOR SLOT */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700/80 flex items-center justify-center text-2xl border border-slate-600">
                  {equippedArmor?.icon || '🛡️'}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    ARMOR SLOT
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    {equippedArmor?.name || 'Empty Slot'}
                  </div>
                  <div className="text-xs text-blue-300 font-medium">
                    {equippedArmor ? equippedArmor.description : 'Equip armor/shield for streak protection'}
                  </div>
                </div>
              </div>
              {equippedArmor && (
                <button
                  onClick={() => handleUnequip('armor')}
                  disabled={equippingSlot === 'armor'}
                  className="btn btn-sm bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs border border-slate-600"
                >
                  {equippingSlot === 'armor' ? <Loader2 size={12} className="animate-spin" /> : 'Unequip'}
                </button>
              )}
            </div>

            {/* RELIC SLOT */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700/80 flex items-center justify-center text-2xl border border-slate-600">
                  {equippedRelic?.icon || '⚡'}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    RELIC SLOT
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    {equippedRelic?.name || 'Empty Slot'}
                  </div>
                  <div className="text-xs text-purple-300 font-medium">
                    {equippedRelic ? equippedRelic.description : 'Equip a relic for XP & gold multipliers'}
                  </div>
                </div>
              </div>
              {equippedRelic && (
                <button
                  onClick={() => handleUnequip('relic')}
                  disabled={equippingSlot === 'relic'}
                  className="btn btn-sm bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs border border-slate-600"
                >
                  {equippingSlot === 'relic' ? <Loader2 size={12} className="animate-spin" /> : 'Unequip'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'shop'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-[#090d16]'
            }`}
          >
            Catalog ({shop.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-[#090d16]'
            }`}
          >
            Inventory ({inventory.length})
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={24} className="animate-spin text-blue-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-semibold">Loading Armory items...</p>
          </div>
        ) : activeTab === 'shop' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shop.map((item) => {
              const rarityStyle =
                RARITY_STYLES[item.rarity.toUpperCase()] || RARITY_STYLES.COMMON;
              const isOwned = ownedItemIds.has(item.id);
              const isBuying = buyingId === item.id;
              const canAfford = (character?.gold || 0) >= item.price;
              const slotTag = item.slot || 'CONSUMABLE';

              return (
                <div
                  key={item.id}
                  className={`card p-5 bg-white border flex flex-col justify-between ${
                    rarityStyle.border
                  } ${isOwned ? 'opacity-75' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">
                        {item.icon || '⚔️'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {slotTag}
                        </span>
                        <span className={`badge ${rarityStyle.badge} text-[10px]`}>
                          {item.rarity}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#090d16] mb-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-mono font-extrabold text-amber-800 text-sm">
                      {item.price.toLocaleString()} G
                    </span>

                    {isOwned ? (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 size={13} /> Acquired
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item.id)}
                        disabled={isBuying || !canAfford}
                        className={`btn btn-sm ${
                          canAfford ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {isBuying ? <Loader2 size={12} className="animate-spin" /> : 'Purchase'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          inventory.length === 0 ? (
            <div className="card p-10 bg-white border border-slate-300 text-center max-w-sm mx-auto">
              <Package size={28} className="text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-[#090d16]">Empty Inventory</h3>
              <p className="text-xs text-slate-600 mt-1 mb-4 font-medium">Acquire items from the Armory catalog to build your loadout.</p>
              <button onClick={() => setActiveTab('shop')} className="btn btn-secondary btn-sm">
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inventory.map((inv) => {
                const item = inv.item;
                const isEquipped = inv.is_equipped;
                const slot = item.slot || 'CONSUMABLE';
                const canEquip = slot === 'WEAPON' || slot === 'ARMOR' || slot === 'RELIC';
                const isProcessing = equippingSlot === `${inv.item_id}`;

                return (
                  <div
                    key={inv.id}
                    className={`card p-5 bg-white border flex flex-col justify-between transition-all ${
                      isEquipped ? 'border-emerald-400 ring-2 ring-emerald-300/30' : 'border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">
                          {item.icon || '🛡️'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {slot}
                          </span>
                          {isEquipped && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={11} /> EQUIPPED
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-extrabold text-sm text-[#090d16] mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500 text-xs">
                        Qty: {inv.quantity}
                      </span>

                      {canEquip ? (
                        isEquipped ? (
                          <button
                            onClick={() => handleUnequip(slot.toLowerCase())}
                            disabled={isProcessing}
                            className="btn btn-sm bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs"
                          >
                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : 'Unequip'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(item.id, slot)}
                            disabled={isProcessing}
                            className="btn btn-sm btn-primary text-xs flex items-center gap-1"
                          >
                            {isProcessing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <>
                                <Sword size={12} />
                                Equip {slot}
                              </>
                            )}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-500 font-semibold">Active in Dossier</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}

