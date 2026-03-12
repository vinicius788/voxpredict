import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarRange,
  Landmark,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MarketCard } from '../components/MarketCard';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MarketCardSkeleton } from '../components/ui/Skeleton';
import { Market } from '../types';
import { useMarkets } from '../hooks/useMarkets';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  política: Landmark,
  cripto: Sparkles,
  economia: BarChart3,
  esportes: Trophy,
};

const classifyDuration = (endDate: string) => {
  const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 'curto';
  if (days <= 90) return 'medio';
  return 'longo';
};

export const Dashboard: React.FC<{
}> = () => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 12;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<'volume' | 'participants' | 'endDate'>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [termFilter, setTermFilter] = useState<'all' | 'curto' | 'medio' | 'longo'>('all');
  const [minProbability, setMinProbability] = useState(0);
  const [volumeRange, setVolumeRange] = useState<{ min: number; max: number }>({ min: 0, max: 1_000_000 });

  const querySortBy = sortBy === 'participants' ? 'volume' : sortBy === 'endDate' ? 'ending' : 'volume';
  const { data: marketsResponse, isLoading, error } = useMarkets({
    category: selectedCategory || undefined,
    search: searchTerm || undefined,
    sortBy: querySortBy,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const markets: Market[] = marketsResponse?.markets || [];

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    markets.forEach((market) => {
      const key = market.category.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [
      { id: 'all', name: 'Todos', count: markets.length },
      ...Array.from(counts.entries()).map(([id, count]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        count,
      })),
    ];
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        const value = `${market.title} ${market.description}`.toLowerCase();
        return value.includes(searchTerm.toLowerCase());
      })
      .filter((market) => !selectedCategory || market.category.toLowerCase() === selectedCategory)
      .filter((market) => {
        if (statusFilter === 'all') return true;
        const active = market.status === 'active' && new Date(market.endDate) > new Date();
        return statusFilter === 'active' ? active : !active;
      })
      .filter((market) => (termFilter === 'all' ? true : classifyDuration(market.endDate) === termFilter))
      .filter(
        (market) =>
          market.totalVolume >= volumeRange.min &&
          market.totalVolume <= volumeRange.max &&
          Math.max(market.simProbability, market.naoProbability) >= minProbability,
      )
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'volume') comparison = a.totalVolume - b.totalVolume;
        if (sortBy === 'participants') comparison = a.totalBettors - b.totalBettors;
        if (sortBy === 'endDate') comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [markets, searchTerm, selectedCategory, statusFilter, termFilter, minProbability, volumeRange, sortBy, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, statusFilter, termFilter, sortBy, sortDirection, searchTerm, minProbability, volumeRange.min, volumeRange.max]);

  const activeFilterCount = [
    statusFilter !== 'all',
    termFilter !== 'all',
    minProbability > 0,
    volumeRange.min > 0,
    volumeRange.max < 1_000_000,
    sortBy !== 'volume' || sortDirection !== 'desc',
  ].filter(Boolean).length;

  const handleToggleFavorite = (marketId: string) => {
    setFavoriteMarkets((prev) =>
      prev.includes(marketId) ? prev.filter((id) => id !== marketId) : [...prev, marketId],
    );
  };

  const handleSelectMarket = (market: Market) => {
    navigate(`/market/${market.id}`, { state: { market } });
  };

  const handleShare = async (market: Market) => {
    const url = `${window.location.origin}/market/${market.id}`;

    if (navigator.share) {
      await navigator.share({ title: market.title, text: market.description, url });
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const resetFilters = () => {
    setSortBy('volume');
    setSortDirection('desc');
    setStatusFilter('all');
    setTermFilter('all');
    setMinProbability(0);
    setVolumeRange({ min: 0, max: 1_000_000 });
  };

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <main className="section-shell py-10">
        <div className="vp-card mb-7 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Mercados</p>
              <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Todos os Mercados</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {filteredMarkets.length} resultados de {marketsResponse?.total ?? markets.length} mercados totais
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por título, assunto ou contexto do mercado"
                  className="vp-input h-11 pl-10 pr-3 text-sm"
                />
              </label>

              <button
                onClick={() => setShowFilterPanel(true)}
                className="vp-btn-ghost inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
                {activeFilterCount > 0 && (
                  <span className="mono-value rounded-full bg-[rgba(124,58,237,0.45)] px-2 py-0.5 text-xs text-[var(--text-primary)]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categoryCounts.map((category) => {
            const Icon = category.id === 'all' ? CalendarRange : categoryIcons[category.id] ?? Sparkles;
            const active = (category.id === 'all' && !selectedCategory) || category.id === selectedCategory;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[999px] border px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'vp-pill-active text-[var(--text-primary)]'
                    : 'vp-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.name} ({category.count})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <MarketCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : error ? (
          <div className="vp-card p-10 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Erro ao carregar mercados</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {(error as Error).message || 'Tente novamente em instantes.'}
            </p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="vp-card p-10 text-center">
            <Search className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
            <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Nenhum mercado encontrado</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ajuste os filtros ou tente um termo de busca diferente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {filteredMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isBrandTheme={true}
                  isFavorited={favoriteMarkets.includes(market.id)}
                  onSelect={handleSelectMarket}
                  onToggleFavorite={handleToggleFavorite}
                  onShare={handleShare}
                />
              ))}
            </div>

            {(marketsResponse?.totalPages || 1) > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-[8px] border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  ← Anterior
                </button>

                <p className="text-sm text-[var(--text-secondary)]">
                  Página <span className="mono-value text-[var(--text-primary)]">{currentPage}</span> de{' '}
                  <span className="mono-value text-[var(--text-primary)]">{marketsResponse?.totalPages || 1}</span>{' '}
                  <small className="text-[var(--text-muted)]">({marketsResponse?.total || filteredMarkets.length} mercados)</small>
                </p>

                <button
                  onClick={() => setCurrentPage((page) => Math.min(marketsResponse?.totalPages || 1, page + 1))}
                  disabled={currentPage === (marketsResponse?.totalPages || 1)}
                  className="rounded-[8px] border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <div
        className={`fixed inset-0 z-[70] bg-[rgba(0,0,0,0.45)] backdrop-blur-sm transition-opacity ${
          showFilterPanel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setShowFilterPanel(false)}
      >
        <aside
          className={`absolute right-0 top-0 h-full w-[92%] max-w-[420px] border-l border-[var(--border)] bg-[var(--brand-800)] p-6 transition-transform ${
            showFilterPanel ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Filtros avançados</h2>
            <button
              onClick={() => setShowFilterPanel(false)}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['all', 'Todos'],
                  ['active', 'Ativos'],
                  ['finished', 'Finalizados'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setStatusFilter(id as typeof statusFilter)}
                    className={`rounded-[8px] border px-3 py-2 text-xs font-semibold transition-colors ${
                      statusFilter === id
                        ? 'border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.24)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Prazo</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['all', 'Todos'],
                  ['curto', 'Curto'],
                  ['medio', 'Médio'],
                  ['longo', 'Longo'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTermFilter(id as typeof termFilter)}
                    className={`rounded-[8px] border px-2 py-2 text-xs font-semibold transition-colors ${
                      termFilter === id
                        ? 'border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.24)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Probabilidade mínima ({minProbability}%)
              </label>
              <input
                type="range"
                min={0}
                max={90}
                value={minProbability}
                onChange={(event) => setMinProbability(Number(event.target.value))}
                className="slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(255,255,255,0.12)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Volume mín.</span>
                <input
                  type="number"
                  value={volumeRange.min}
                  onChange={(event) =>
                    setVolumeRange((prev) => ({
                      ...prev,
                      min: Number(event.target.value) || 0,
                    }))
                  }
                  className="vp-input h-10 px-3 text-sm"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Volume máx.</span>
                <input
                  type="number"
                  value={volumeRange.max}
                  onChange={(event) =>
                    setVolumeRange((prev) => ({
                      ...prev,
                      max: Number(event.target.value) || 1_000_000,
                    }))
                  }
                  className="vp-input h-10 px-3 text-sm"
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Ordenação</label>
              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(event) => {
                  const [newSortBy, newDirection] = event.target.value.split('-') as [
                    'volume' | 'participants' | 'endDate',
                    'asc' | 'desc',
                  ];
                  setSortBy(newSortBy);
                  setSortDirection(newDirection);
                }}
                className="vp-input h-10 px-3 text-sm"
              >
                <option value="volume-desc">Volume (maior para menor)</option>
                <option value="volume-asc">Volume (menor para maior)</option>
                <option value="participants-desc">Participantes (mais para menos)</option>
                <option value="participants-asc">Participantes (menos para mais)</option>
                <option value="endDate-asc">Prazo mais próximo</option>
                <option value="endDate-desc">Prazo mais distante</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={resetFilters}
              className="rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Redefinir
            </button>
            <button
              onClick={() => setShowFilterPanel(false)}
              className="vp-btn-primary px-4 py-2 text-sm font-semibold"
            >
              Aplicar
            </button>
          </div>
        </aside>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
