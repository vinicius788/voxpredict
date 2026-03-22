import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe2 } from 'lucide-react';
import { api } from '../lib/api-client';

type PolymarketReferencePayload = {
  reference?: {
    title: string;
    url: string;
    volume: number;
    yesProbability: number;
    noProbability: number;
    yesOdds: number;
    noOdds: number;
  } | null;
};

interface PolymarketReferenceProps {
  marketId: number;
}

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

export function PolymarketReference({ marketId }: PolymarketReferenceProps) {
  const referenceQuery = useQuery({
    queryKey: ['polymarket-reference', marketId],
    queryFn: () => api.getPolymarketReference(marketId) as Promise<PolymarketReferencePayload>,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const reference = referenceQuery.data?.reference || null;

  if (referenceQuery.isLoading) {
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

      <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{reference.title}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-[#6ee7b7]">SIM global</p>
          <p className="mt-2 text-2xl font-semibold text-[#34d399]">{(reference.yesProbability * 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{reference.yesOdds.toFixed(2)}x</p>
        </div>

        <div className="rounded-[12px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-[#fca5a5]">NÃO global</p>
          <p className="mt-2 text-2xl font-semibold text-[#f87171]">{(reference.noProbability * 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{reference.noOdds.toFixed(2)}x</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Volume global</p>
          <p className="mono-value mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {formatCompactCurrency(reference.volume)}
          </p>
        </div>

        <p className="max-w-[140px] text-right text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Indicativo para comparar sentimento global com o VoxPredict.
        </p>
      </div>
    </section>
  );
}
