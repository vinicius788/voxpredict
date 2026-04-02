import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity } from 'lucide-react';
import { api } from '../lib/api-client';

type ActivityItem = {
  id: string;
  type: string;
  side: string | null;
  amount: number;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
  market: {
    id: number;
    question: string;
    category: string;
  };
};

interface ActivityFeedProps {
  marketId?: number | string;
  limit?: number;
  className?: string;
}

const SIDE_COLORS: Record<string, string> = {
  YES: 'text-[var(--yes)]',
  NO: 'text-[var(--no)]',
};

const SIDE_LABELS: Record<string, string> = {
  YES: 'SIM',
  NO: 'NÃO',
};

const formatAmount = (amount: number) => {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
};

const UserAvatar: React.FC<{ username: string | null; avatarUrl: string | null }> = ({
  username,
  avatarUrl,
}) => {
  const initial = (username || '?')[0].toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username || 'user'}
        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-6 h-6 rounded-full bg-[var(--purple-primary)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
      {initial}
    </div>
  );
};

const ActivityRow: React.FC<{ item: ActivityItem; showMarket: boolean }> = ({ item, showMarket }) => {
  const sideColor = item.side ? SIDE_COLORS[item.side] ?? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]';
  const sideLabel = item.side ? SIDE_LABELS[item.side] ?? item.side : '';
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR });

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[var(--border-faint)] last:border-0 animate-fade-in">
      <UserAvatar username={item.user.username} avatarUrl={item.user.avatarUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[var(--text-primary)] text-sm font-medium truncate max-w-[120px]">
            {item.user.username || 'Anônimo'}
          </span>
          <span className="text-[var(--text-muted)] text-xs">apostou</span>
          <span className="text-[var(--text-primary)] text-sm font-semibold font-mono">
            {formatAmount(item.amount)}
          </span>
          {sideLabel && (
            <>
              <span className="text-[var(--text-muted)] text-xs">em</span>
              <span className={`text-sm font-bold ${sideColor}`}>{sideLabel}</span>
            </>
          )}
        </div>
        {showMarket && (
          <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{item.market.question}</p>
        )}
        <p className="text-[var(--text-faint)] text-xs mt-0.5">{timeAgo}</p>
      </div>
    </div>
  );
};

const SkeletonRow: React.FC = () => (
  <div className="flex items-start gap-2.5 py-2.5 border-b border-[var(--border-faint)] last:border-0">
    <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-3/4" />
      <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-1/2" />
    </div>
  </div>
);

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  marketId,
  limit = 20,
  className = '',
}) => {
  const isGlobal = !marketId;

  const { data, isLoading } = useQuery({
    queryKey: marketId ? ['market-activity', marketId] : ['global-activity'],
    queryFn: async () => {
      const response = marketId
        ? await api.getMarketActivity(marketId, limit)
        : await api.getGlobalActivity(limit);
      return (response.data || []) as ActivityItem[];
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[var(--purple-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {isGlobal ? 'Atividade Global' : 'Atividade Recente'}
        </h3>
        {!isLoading && data && data.length > 0 && (
          <span className="ml-auto text-xs text-[var(--text-faint)]">ao vivo</span>
        )}
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <p className="text-[var(--text-muted)] text-sm text-center py-6">
          Nenhuma atividade ainda.
        </p>
      )}

      {!isLoading && data && data.length > 0 && (
        <div>
          {data.map((item) => (
            <ActivityRow key={item.id} item={item} showMarket={isGlobal} />
          ))}
        </div>
      )}
    </div>
  );
};
