'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { shopService, characterService } from '@/lib/api';
import { Item, InventoryItem, Character } from '@/types';
import Navbar from '@/components/Navbar';
import {
  ShoppingBag,
  Package,
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
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

  const ownedItemIds = new Set(inventory.map((inv) => inv.item_id));

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex flex-col">
      <Navbar character={character} />

      {/* ── CENTERED MASTER CONTAINER ── */}
      <main className="flex-1 app-container py-6 sm:py-8">
        {/* Header Card */}
        <div className="card p-5 sm:p-6 mb-6 bg-white border border-slate-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-mono font-extrabold mb-1">
              <ShoppingBag size={14} />
              <span>EQUIPMENT ARMORY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#090d16]">
              Armory Catalog
            </h1>
            <p className="text-xs text-slate-700 mt-0.5 font-medium">
              Reinvest gold collected from completed quests into artifacts, equipment, and perks.
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

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'shop'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-[#090d16]'
            }`}
          >
            Catalog ({shop.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

              return (
                <div
                  key={item.id}
                  className={`card p-5 bg-white border flex flex-col justify-between ${
                    rarityStyle.border
                  } ${isOwned ? 'opacity-65' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">
                        {item.icon || '⚔️'}
                      </span>
                      <span className={`badge ${rarityStyle.badge} text-[10px]`}>
                        {item.rarity}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#090d16] mb-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2 font-medium">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-mono font-extrabold text-amber-800 text-sm">
                      {item.price.toLocaleString()} G
                    </span>

                    {isOwned ? (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
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
              <p className="text-xs text-slate-600 mt-1 mb-4 font-medium">Acquire items from the Armory catalog.</p>
              <button onClick={() => setActiveTab('shop')} className="btn btn-secondary btn-sm">
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inventory.map((inv) => (
                <div key={inv.id} className="card p-5 bg-white border border-slate-300 flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-3 p-2 rounded-xl bg-slate-50 border border-slate-200 inline-block">
                      {inv.item?.icon || '🛡️'}
                    </div>
                    <h3 className="font-bold text-sm text-[#090d16] mb-1">
                      {inv.item?.name || 'Item'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">
                      {inv.item?.description || 'Equipped in character dossier.'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200 text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <span>Active in Dossier</span>
                    <span>✓</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
