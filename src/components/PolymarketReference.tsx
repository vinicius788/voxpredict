import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe2, Radio } from 'lucide-react';
import { usePolymarketReference } from '../hooks/usePolymarket';

interface PolymarketReferenceProps {
  marketId: number | string;
}

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

const extractLivePrice = (input: Record<string, unknown>) => {
  const directCandidates = [
    input.price,
    input.mid,
    input.last_trade_price,
    input.lastTradePrice,
  ];

  for (const candidate of directCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0 && value <= 1) {
      return value;
    }
  }

  const bestBid = Number(input.best_bid ?? input.bestBid ?? input.bid);
  const bestAsk = Number(input.best_ask ?? input.bestAsk ?? input.ask);

  if (Number.isFinite(bestBid) && Number.isFinite(bestAsk) && bestBid >= 0 && bestAsk >= 0) {
    const midpoint = (bestBid + bestAsk) / 2;
    if (midpoint >= 0 && midpoint <= 1) {
      return midpoint;
    }
  }

  return null;
};

export function PolymarketReference({ marketId }: PolymarketReferenceProps) {
  const { data: reference, isLoading } = usePolymarketReference(marketId);
  const [liveAssetPrices, setLiveAssetPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    setLiveAssetPrices({});
  }, [reference?.yesTokenId, reference?.noTokenId]);

  useEffect(() => {
    if (!reference?.yesTokenId && !reference?.noTokenId) return;

    const assetIds = [reference.yesTokenId, reference.noTokenId].filter((assetId): assetId is string => Boolean(assetId));
    if (assetIds.length === 0) return;

    const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          auth: {},
          type: 'Market',
          assets_ids: assetIds,
          custom_feature_enabled: true,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as unknown;
        const messages = Array.isArray(payload) ? payload : [payload];

        messages.forEach((message) => {
          if (!message || typeof message !== 'object') return;

          const candidate = message as Record<string, unknown>;
          const assetId = String(candidate.asset_id ?? candidate.assetId ?? candidate.token_id ?? '');
          if (!assetId || !assetIds.includes(assetId)) return;

          const price = extractLivePrice(candidate);
          if (price === null) return;

          setLiveAssetPrices((previous) => {
            if (previous[assetId] === price) return previous;
            return { ...previous, [assetId]: price };
          });
        });
      } catch {
        // Ignore transient websocket payload errors.
      }
    };

    return () => ws.close();
  }, [reference?.noTokenId, reference?.yesTokenId]);

  const liveProbabilities = useMemo(() => {
    if (!reference) return null;

    const liveYes = reference.yesTokenId ? liveAssetPrices[reference.yesTokenId] : undefined;
    const liveNo = reference.noTokenId ? liveAssetPrices[reference.noTokenId] : undefined;

    if (liveYes === undefined && liveNo === undefined) return null;

    const yesCandidate = liveYes ?? (liveNo !== undefined ? 1 - liveNo : reference.yesProbability);
    const noCandidate = liveNo ?? (liveYes !== undefined ? 1 - liveYes : reference.noProbability);
    const total = yesCandidate + noCandidate;

    if (!Number.isFinite(total) || total <= 0) return null;

    const yesProbability = yesCandidate / total;
    const noProbability = noCandidate / total;

    return {
      yesProbability,
      noProbability,
      yesOdds: yesProbability > 0 ? 1 / yesProbability : reference.yesOdds,
      noOdds: noProbability > 0 ? 1 / noProbability : reference.noOdds,
    };
  }, [liveAssetPrices, reference]);

  if (isLoading) {
    return (
      <section className="vp-card p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
        <div className="mt-3 h-12 animate-pulse rounded-[10px] bg-[rgba(255,255,255,0.06)]" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-[12px] bg-[rgba(16,185,129,0.08)]" />
          <div className="h-20 animate-pulse rounded-[12px] bg-[rgba(239,68,68,0.08)]" />
        </div>
      </section>
    );
  }

  if (!reference) return null;

  const displayYesProbability = liveProbabilities?.yesProbability ?? reference.yesProbability;
  const displayNoProbability = liveProbabilities?.noProbability ?? reference.noProbability;
  const displayYesOdds = liveProbabilities?.yesOdds ?? reference.yesOdds;
  const displayNoOdds = liveProbabilities?.noOdds ?? reference.noOdds;

  return (
    <section className="vp-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <Globe2 className="h-3.5 w-3.5 text-[#60a5fa]" /> Referência Global
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Polymarket</h2>
        </div>

        <a
          href={reference.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver
        </a>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{reference.title}</p>
        {liveProbabilities && (
          <span className="inline-flex items-center gap-1 rounded-[999px] border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6ee7b7]">
            <Radio className="h-3.5 w-3.5" />
            Live
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-[#6ee7b7]">SIM global</p>
          <p className="mt-2 text-2xl font-semibold text-[#34d399]">{(displayYesProbability * 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{displayYesOdds.toFixed(2)}x</p>
        </div>

        <div className="rounded-[12px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-[#fca5a5]">NÃO global</p>
          <p className="mt-2 text-2xl font-semibold text-[#f87171]">{(displayNoProbability * 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{displayNoOdds.toFixed(2)}x</p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center justify-between gap-3">
          <span>Volume live</span>
          <span className="mono-value font-semibold text-[var(--text-primary)]">
            {formatCompactCurrency(reference.marketLiveVolume || reference.volumeLive)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>Volume total</span>
          <span className="mono-value font-semibold text-[var(--text-primary)]">
            {formatCompactCurrency(reference.volumeTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}
