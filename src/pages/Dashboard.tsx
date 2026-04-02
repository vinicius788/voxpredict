import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Globe2,
  Scale,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MarketCard } from '../components/MarketCard';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MarketCardSkeleton } from '../components/ui/Skeleton';
import { Market } from '../types';
import { useMarkets } from '../hooks/useMarkets';

const categoryMeta: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  all: { label: 'Todos', icon: BarChart3, accent: 'text-[var(--text-muted)]' },
  cripto: { label: 'Cripto', icon: TrendingUp, accent: 'text-[var(--text-muted)]' },
  politica: { label: 'Política', icon: Scale, accent: 'text-[var(--text-muted)]' },
  esportes: { label: 'Esportes', icon: Activity, accent: 'text-[var(--text-muted)]' },
  economia: { label: 'Economia', icon: BarChart3, accent: 'text-[var(--text-muted)]' },
  geopolitica: { label: 'Geopolítica', icon: Globe2, accent: 'text-[var(--text-muted)]' },
};

const classifyDuration = (endDate: string) => {
  const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 'curto';
  if (days <= 90) return 'medio';
  return 'longo';
};

export const Dashboard: React.FC = () => {
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
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
      const key = market.category
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [
      { id: 'all', name: 'Todos', count: markets.length },
      ...Array.from(counts.entries()).map(([id, count]) => ({
        id,
        name: categoryMeta[id]?.label || id.charAt(0).toUpperCase() + id.slice(1),
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
      .filter((market) => !selectedCategory || market.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === selectedCategory)
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
      .filter((market) => (favoritesOnly ? favoriteMarkets.includes(market.id) : true))
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'volume') comparison = a.totalVolume - b.totalVolume;
        if (sortBy === 'participants') comparison = a.totalBettors - b.totalBettors;
        if (sortBy === 'endDate') comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [markets, searchTerm, selectedCategory, statusFilter, termFilter, minProbability, volumeRange, sortBy, sortDirection, favoritesOnly, favoriteMarkets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, statusFilter, termFilter, sortBy, sortDirection, searchTerm, minProbability, volumeRange.min, volumeRange.max, favoritesOnly]);

  const activeFilterCount = [
    statusFilter !== 'all',
    termFilter !== 'all',
    minProbability > 0,
    volumeRange.min > 0,
    volumeRange.max < 1_000_000,
    favoritesOnly,
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
    setFavoritesOnly(false);
    setVolumeRange({ min: 0, max: 1_000_000 });
  };

  return (
    <div className="app-shell pb-16 lg:pb-0">
      <Header />

      <main className="section-shell py-10">
        <div className="vp-card mb-7 overflow-hidden p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_40%)] pointer-events-none" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Mercados</p>
              <h1 className="mt-1 text-3xl font-black text-[var(--text-primary)] md:text-4xl">Todos os Mercados</h1>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-sm text-[var(--text-primary)]">
                <span className="mono-value rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs text-[var(--text-primary)]">{filteredMarkets.length}</span>
                <span className="text-[var(--text-secondary)]">resultados de {marketsResponse?.total ?? markets.length} mercados</span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="relative min-w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por evento, tese, ativo ou contexto"
                  className="vp-input h-12 pl-10 pr-3 text-sm"
                />
              </label>

              <button onClick={() => setShowFilterPanel(true)} className="vp-btn-ghost inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 ? (
                  <span className="mono-value rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-xs text-[var(--text-primary)]">{activeFilterCount}</span>
                ) : null}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categoryCounts.map((category) => {
            const meta = categoryMeta[category.id] || { label: category.name, icon: BarChart3, accent: 'text-[var(--text-muted)]' };
            const active = (category.id === 'all' && !selectedCategory) || category.id === selectedCategory;
            const Icon = meta.icon;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === 'all' ? null : category.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[6px] border px-3 py-2 text-[13px] font-semibold transition-all ${
                  active
                    ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                    : 'border-white/10 bg-white/4 text-[var(--text-secondary)] hover:border-white/20 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${meta.accent}`} />
                {meta.label}
                <span className="mono-value rounded-[3px] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">{category.count}</span>
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
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{(error as Error).message || 'Tente novamente em instantes.'}</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="vp-empty-state">
            <Search className="h-8 w-8" />
            <h3 className="mt-4 text-xl font-bold text-white">Nenhum mercado encontrado</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Ajuste filtros, remova favoritos ou tente outra palavra-chave.</p>
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

            {(marketsResponse?.totalPages || 1) > 1 ? (
              <div className="mt-6 flex items-center justify-between rounded-[14px] border border-white/10 bg-white/4 px-4 py-3">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-white disabled:opacity-50"
                >
                  ← Anterior
                </button>

                <p className="text-sm text-[var(--text-secondary)]">
                  Página <span className="mono-value text-white">{currentPage}</span> de <span className="mono-value text-white">{marketsResponse?.totalPages || 1}</span>
                </p>

                <button
                  onClick={() => setCurrentPage((page) => Math.min(marketsResponse?.totalPages || 1, page + 1))}
                  disabled={currentPage === (marketsResponse?.totalPages || 1)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-white disabled:opacity-50"
                >
                  Próxima →
                </button>
              </div>
            ) : null}
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
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Filtros avançados</h2>
            <button onClick={() => setShowFilterPanel(false)} className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
              Fechar
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['all', 'Todos'],
                  ['active', 'Ativos'],
                  ['finished', 'Encerrados'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setStatusFilter(id as typeof statusFilter)}
                    className={`rounded-[10px] border px-3 py-2 text-xs font-semibold transition-colors ${
                      statusFilter === id
                        ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Prazo</p>
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
                    className={`rounded-[10px] border px-2 py-2 text-xs font-semibold transition-colors ${
                      termFilter === id
                        ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Probabilidade mínima ({minProbability}%)</label>
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
                <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Volume mín.</span>
                <input
                  type="number"
                  value={volumeRange.min}
                  onChange={(event) => setVolumeRange((prev) => ({ ...prev, min: Number(event.target.value) || 0 }))}
                  className="vp-input h-10 px-3 text-sm"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Volume máx.</span>
                <input
                  type="number"
                  value={volumeRange.max}
                  onChange={(event) => setVolumeRange((prev) => ({ ...prev, max: Number(event.target.value) || 1_000_000 }))}
                  className="vp-input h-10 px-3 text-sm"
                />
              </label>
            </div>

            <label className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <span>Somente favoritos</span>
              <input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} className="h-4 w-4 accent-[var(--accent-primary)]" />
            </label>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Ordenar por</label>
              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(event) => {
                  const [newSortBy, newDirection] = event.target.value.split('-') as ['volume' | 'participants' | 'endDate', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortDirection(newDirection);
                }}
                className="vp-input h-10 px-3 text-sm"
              >
                <option value="volume-desc">Volume</option>
                <option value="participants-desc">Participantes</option>
                <option value="endDate-asc">Terminando em breve</option>
                <option value="endDate-desc">Mais distantes</option>
                <option value="volume-asc">Menor volume</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={resetFilters} className="vp-btn-ghost flex-1 px-4 py-2 text-sm font-semibold">Limpar</button>
              <button onClick={() => setShowFilterPanel(false)} className="vp-btn-primary flex-1 px-4 py-2 text-sm font-semibold">Aplicar</button>
            </div>
          </div>
        </aside>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};
