import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link2, MessageCircle } from 'lucide-react';
import type { Market } from '../types';

interface ShareMarketButtonProps {
  market: Market;
  userBet?: { side: boolean; amount: number; odds: number };
}

const APP_URL = 'https://voxpredict.vercel.app';

const safeOpen = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export function ShareMarketButton({ market, userBet }: ShareMarketButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const probability =
    market.yesProbability !== undefined ? market.yesProbability : Math.max(0, Math.min(1, market.simProbability / 100));
  const url = `${APP_URL}/market/${market.id}`;

  const betText = userBet
    ? `Apostei $${userBet.amount} em ${userBet.side ? 'SIM' : 'NÃO'} (${userBet.odds.toFixed(2)}x) no VoxPredict!`
    : `Esse mercado está ${(probability * 100).toFixed(0)}% SIM no VoxPredict.`;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMenu(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
      setShowMenu(false);
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
         Compartilhar
      </button>

      {showMenu ? (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-[#1e1e30] p-2 shadow-2xl">
          <button
            type="button"
            onClick={() =>
              {
                setShowMenu(false);
                safeOpen(`https://wa.me/?text=${encodeURIComponent(`${betText}\n\n${url}`)}`);
              }
            }
            className="mb-1 flex w-full items-center gap-3 rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-500"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() =>
              {
                setShowMenu(false);
                safeOpen(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    betText,
                  )}&url=${encodeURIComponent(url)}&hashtags=VoxPredict,MercadosPreditivos`,
                );
              }
            }
            className="mb-1 flex w-full items-center gap-3 rounded-lg border border-white/20 bg-black px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
          >
            <span>𝕏</span>
            X (Twitter)
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition-colors hover:bg-white/20"
          >
            <Link2 className="h-4 w-4" />
            Copiar link
          </button>
        </div>
      ) : null}
    </div>
  );
}
