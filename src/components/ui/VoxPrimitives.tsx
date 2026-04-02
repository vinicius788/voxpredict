import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart2,
  Clock3,
  Flame,
  Globe,
  Scale,
  TrendingUp,
  Trophy,
} from 'lucide-react';

type CategoryMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  cripto: {
    label: 'Cripto',
    icon: TrendingUp,
  },
  politica: {
    label: 'Política',
    icon: Scale,
  },
  esportes: {
    label: 'Esportes',
    icon: Activity,
  },
  economia: {
    label: 'Economia',
    icon: BarChart2,
  },
  geopolitica: {
    label: 'Geopolítica',
    icon: Globe,
  },
  tecnologia: {
    label: 'Tecnologia',
    icon: Activity,
  },
};

const normalizeCategoryKey = (value?: string | null) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');

export const getCategoryMeta = (value?: string | null): CategoryMeta => {
  const normalized = normalizeCategoryKey(value);
  return (
    CATEGORY_META[normalized] || {
      label: value || 'Mercado',
      icon: TrendingUp,
    }
  );
};

export const CategoryBadge: React.FC<{ category?: string; compact?: boolean }> = ({ category, compact = false }) => {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)] ${
        compact ? 'text-[10px]' : 'text-[11px]'
      }`}
    >
      <Icon className="h-3 w-3" />
      <span>{meta.label}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: string; pulse?: boolean }> = ({ status, pulse = false }) => {
  const normalized = (status || '').toLowerCase();
  const isActive = normalized === 'active' || normalized === 'ativo';
  const isPending = normalized === 'pending' || normalized === 'pendente';
  const dotClass = isActive ? 'bg-[var(--yes)]' : isPending ? 'bg-[var(--border-strong)]' : 'bg-[var(--text-tertiary)]';

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${pulse && isActive ? 'animate-[pulse_2s_infinite]' : ''}`} />
      {isActive ? 'Ativo' : isPending ? 'Pendente' : 'Encerrado'}
    </span>
  );
};

export const MultiplierBadge: React.FC<{ value: number; align?: 'left' | 'right' }> = ({ value, align = 'right' }) => (
  <span className={`mono-value text-[13px] font-semibold text-[var(--gold)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
    {value.toFixed(2)}x
  </span>
);

export const ProgressBar: React.FC<{
  value: number;
  color: 'green' | 'red' | 'purple' | 'slate';
  height?: number;
  animated?: boolean;
  className?: string;
}> = ({ value, color, height = 8, animated = false, className = '' }) => {
  const fillClass =
    color === 'green'
      ? 'bg-[var(--yes)]'
      : color === 'red'
        ? 'bg-[var(--no)]'
        : color === 'purple'
          ? 'bg-[var(--action)]'
          : 'bg-[var(--text-secondary)]';

  return (
    <div className={`relative overflow-hidden rounded-full bg-white/5 ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-full ${fillClass} ${animated ? 'transition-[width] duration-300 ease-out' : ''}`}
        style={{ width: `${Math.min(100, Math.max(4, value))}%` }}
      />
    </div>
  );
};

export const LiveIndicator: React.FC<{ label?: string }> = ({ label = 'AO VIVO' }) => (
  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
    <span className="h-1.5 w-1.5 rounded-full bg-[var(--yes)] animate-[pulse_2s_infinite]" />
    {label}
  </span>
);

export const TrendingBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
    <Flame className="h-2.5 w-2.5" />
    Trending
  </span>
);

const getCountdownValue = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) {
    return {
      label: 'Encerrado',
      tone: 'text-[var(--text-muted)]',
      border: 'border-[var(--border-faint)]',
      background: 'bg-transparent',
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const label = `${days}d ${hours}h ${minutes}m`;

  if (days <= 2) {
    return {
      label,
      tone: 'text-[var(--text-secondary)]',
      border: 'border-[var(--border-faint)]',
      background: 'bg-transparent',
    };
  }

  if (days <= 7) {
    return {
      label,
      tone: 'text-[var(--text-secondary)]',
      border: 'border-[var(--border-faint)]',
      background: 'bg-transparent',
    };
  }

  return {
    label,
    tone: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border-faint)]',
    background: 'bg-transparent',
  };
};

export const CountdownTimer: React.FC<{ endDate: string; compact?: boolean }> = ({ endDate, compact = false }) => {
  const [countdown, setCountdown] = useState(() => getCountdownValue(endDate));

  useEffect(() => {
    const tick = () => setCountdown(getCountdownValue(endDate));
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${countdown.border} ${countdown.background} ${countdown.tone} ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs font-semibold'
      }`}
    >
      <Clock3 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span className="mono-value">{countdown.label}</span>
    </span>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta?: React.ReactNode;
}> = ({ icon: Icon = Trophy, title, description, cta }) => (
  <div className="vp-empty-state">
    <div className="vp-empty-state__icon">
      <Icon className="h-8 w-8" />
    </div>
    <h3 className="mt-4 text-xl font-bold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    {cta ? <div className="mt-5">{cta}</div> : null}
  </div>
);

export const useGreeting = () =>
  useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);
