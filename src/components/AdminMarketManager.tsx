import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, CheckCircle2, Archive, Search, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Market } from '../types';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useMarkets, useResolveMarket } from '../hooks/useMarkets';
import { api, request } from '../lib/api-client';

interface AdminMarketManagerProps {
  isBrandTheme?: boolean;
}

const PAGE_SIZE = 8;
type EditableMarket = Pick<Market, 'id' | 'title' | 'description' | 'endDate'>;

const categoryBadgeColors: Record<string, string> = {
  cripto: 'bg-[rgba(249,115,22,0.16)] text-[#fdba74] border-[rgba(249,115,22,0.35)]',
  política: 'bg-[rgba(59,130,246,0.16)] text-[#93c5fd] border-[rgba(59,130,246,0.35)]',
  politica: 'bg-[rgba(59,130,246,0.16)] text-[#93c5fd] border-[rgba(59,130,246,0.35)]',
  economia: 'bg-[rgba(16,185,129,0.16)] text-[#6ee7b7] border-[rgba(16,185,129,0.35)]',
  esportes: 'bg-[rgba(239,68,68,0.16)] text-[#fca5a5] border-[rgba(239,68,68,0.35)]',
  tecnologia: 'bg-[rgba(139,92,246,0.16)] text-[#c4b5fd] border-[rgba(139,92,246,0.35)]',
};

const getStatusStyles = (status: string) => {
  if (status === 'active') {
    return { label: 'Ativo', classes: 'bg-green-500/20 text-green-400' };
  }
  if (status === 'resolved') {
    return { label: 'Resolvido', classes: 'bg-blue-500/20 text-blue-400' };
  }
  if (status === 'pending') {
    return { label: 'Pendente', classes: 'bg-amber-500/20 text-amber-400' };
  }
  if (status === 'closed') {
    return { label: 'Cancelado', classes: 'bg-red-500/20 text-red-400' };
  }
  return { label: status, classes: 'bg-gray-500/20 text-gray-300' };
};

export const AdminMarketManager: React.FC<AdminMarketManagerProps> = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();
  const {
    data: marketsResponse,
    refetch,
    isLoading,
    isError,
    error,
  } = useMarkets({ limit: 200, includeAll: true });
  const { mutateAsync: resolveMarket } = useResolveMarket();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);
  const [editingMarket, setEditingMarket] = useState<EditableMarket | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const allMarkets = useMemo(() => marketsResponse?.markets || [], [marketsResponse?.markets]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(allMarkets.map((market) => market.category)));
    return ['all', ...unique];
  }, [allMarkets]);

  const filteredMarkets = useMemo(() => {
    return allMarkets
      .filter((market) => {
        if (statusFilter === 'all') return true;
        return market.status === statusFilter;
      })
      .filter((market) => (categoryFilter === 'all' ? true : market.category === categoryFilter))
      .filter((market) => {
        const value = `${market.title} ${market.description}`.toLowerCase();
        return value.includes(search.toLowerCase());
      });
  }, [allMarkets, categoryFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));

  const paginatedMarkets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMarkets.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredMarkets]);

  const applyOverride = async (marketId: string, patch: Partial<Market>) => {
    try {
      if (patch.status === 'resolved') {
        await resolveMarket({ id: Number(marketId), outcome: 'YES' });
      } else if (patch.status === 'closed') {
        await request(`/api/markets/${marketId}`, { method: 'DELETE' });
      }
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error('Falha ao atualizar mercado.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedMarketIds.length === paginatedMarkets.length) {
      setSelectedMarketIds([]);
      return;
    }

    setSelectedMarketIds(paginatedMarkets.map((market) => market.id));
  };

  const toggleSelection = (marketId: string) => {
    setSelectedMarketIds((prev) =>
      prev.includes(marketId) ? prev.filter((id) => id !== marketId) : [...prev, marketId],
    );
  };

  const resolveSelected = async () => {
    if (!selectedMarketIds.length) return;

    try {
      await Promise.all(selectedMarketIds.map((id) => resolveMarket({ id: Number(id), outcome: 'YES' })));
      toast.success(`${selectedMarketIds.length} mercado(s) resolvido(s) em lote.`);
      setSelectedMarketIds([]);
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error('Falha ao resolver mercados em lote.');
    }
  };

  const toDatetimeLocal = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleSaveEdit = async () => {
    if (!editingMarket) return;

    const question = editingMarket.title.trim();
    const description = editingMarket.description.trim();
    if (!question || !description) {
      toast.error('Pergunta e descrição são obrigatórias.');
      return;
    }

    const payload: Record<string, unknown> = {
      question,
      description,
    };

    if (editingMarket.endDate) {
      const parsedDate = new Date(editingMarket.endDate);
      if (Number.isNaN(parsedDate.getTime())) {
        toast.error('Data de encerramento inválida.');
        return;
      }
      payload.endTime = parsedDate.toISOString();
    }

    try {
      setIsSavingEdit(true);
      await api.updateMarket(Number(editingMarket.id), payload);
      toast.success('Mercado atualizado!');
      setEditingMarket(null);
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error('Falha ao atualizar mercado.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-8 text-center">
        <p className="text-gray-400">Apenas administradores podem gerenciar mercados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Gerenciar Mercados</h2>
            <p className="text-sm text-gray-400">Filtros, ações em lote e gestão operacional.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por texto"
              className="h-10 w-full rounded-lg border border-white/10 bg-[#0f0f1a] pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as typeof statusFilter);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-white/10 bg-[#0f0f1a] px-3 text-sm text-gray-300 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativo</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Cancelado</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-white/10 bg-[#0f0f1a] px-3 text-sm text-gray-300 focus:border-amber-500/50 focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                Categoria: {category === 'all' ? 'Todas' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-[10px] border border-white/10 bg-[#0f0f1a]" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">
              Falha ao carregar mercados{error instanceof Error ? `: ${error.message}` : '.'}
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-3 rounded-[8px] bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <svg viewBox="0 0 180 120" className="mx-auto h-24 w-36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="178" height="118" rx="16" stroke="rgba(255,255,255,0.08)" />
              <circle cx="90" cy="60" r="24" stroke="rgba(167,139,250,0.45)" strokeWidth="2" />
              <path d="M74 60H106" stroke="rgba(167,139,250,0.45)" strokeWidth="2" />
              <path d="M90 46V74" stroke="rgba(167,139,250,0.45)" strokeWidth="2" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-white">Nenhum mercado encontrado</h3>
            <p className="mt-1 text-sm text-gray-400">Crie o primeiro mercado da plataforma.</p>
            <button
              onClick={() => {
                navigate({ pathname: '/admin', search: '?tab=create', hash: '#create' });
              }}
              className="mt-5 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Criar primeiro mercado
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-gray-300">{filteredMarkets.length} mercados encontrados</div>
              <button
                onClick={resolveSelected}
                disabled={!selectedMarketIds.length}
                className="rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.15)] px-3 py-1.5 text-xs font-semibold text-[#6ee7b7] disabled:opacity-50"
              >
                Resolver em lote ({selectedMarketIds.length})
              </button>
            </div>

            <div className="overflow-x-auto rounded-[10px] border border-white/10">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead className="bg-[#0f0f1a] text-left text-xs uppercase tracking-[0.08em] text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5"><input type="checkbox" checked={selectedMarketIds.length === paginatedMarkets.length && paginatedMarkets.length > 0} onChange={toggleSelectAll} /></th>
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Pergunta</th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5">Volume</th>
                    <th className="px-3 py-2.5">Participantes</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Encerramento</th>
                    <th className="px-3 py-2.5">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMarkets.map((market) => (
                    <tr key={market.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selectedMarketIds.includes(market.id)} onChange={() => toggleSelection(market.id)} /></td>
                      <td className="mono-value px-3 py-2.5 text-gray-300">{market.id}</td>
                      <td className="max-w-[280px] line-clamp-2 px-3 py-2.5 text-white">{market.title}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            categoryBadgeColors[market.category.toLowerCase()] || 'bg-[rgba(124,58,237,0.16)] text-[#d8b4fe] border-[rgba(124,58,237,0.35)]'
                          }`}
                        >
                          {market.category}
                        </span>
                      </td>
                      <td className="mono-value px-3 py-2.5 text-gray-300">${market.totalVolume.toFixed(0)}</td>
                      <td className="mono-value px-3 py-2.5 text-gray-300">{market.totalBettors}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusStyles(market.status).classes}`}>
                          {getStatusStyles(market.status).label}
                        </span>
                      </td>
                      <td className="mono-value px-3 py-2.5 text-gray-300">{new Date(market.endDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/market/${market.id}`, { state: { market } })} className="p-1.5 text-gray-300 hover:text-white" title="Ver"><Eye className="w-4 h-4" /></button>
                          <button
                            onClick={() =>
                              setEditingMarket({
                                id: market.id,
                                title: market.title,
                                description: market.description,
                                endDate: toDatetimeLocal(market.endDate),
                              })
                            }
                            className="p-1.5 text-gray-300 hover:text-white"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => void applyOverride(market.id, { status: 'resolved' })} className="p-1.5 text-[#6ee7b7]" title="Resolver"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => void applyOverride(market.id, { status: 'closed' })} className="p-1.5 text-[#fca5a5]" title="Arquivar"><Archive className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-300">Página {currentPage} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-[8px] border border-white/10 px-3 py-1.5 text-xs text-gray-300 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-[8px] border border-white/10 px-3 py-1.5 text-xs text-gray-300 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-[12px] border border-[var(--border)] bg-[var(--brand-800)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Editar Mercado #{editingMarket.id}</h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pergunta</label>
                <input
                  value={editingMarket.title}
                  onChange={(event) =>
                    setEditingMarket((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  className="h-11 w-full rounded-[8px] border border-white/10 bg-[#0f0f1a] px-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Descrição</label>
                <textarea
                  value={editingMarket.description}
                  onChange={(event) =>
                    setEditingMarket((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                  className="min-h-[110px] w-full rounded-[8px] border border-white/10 bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Encerramento</label>
                <input
                  type="datetime-local"
                  value={editingMarket.endDate}
                  onChange={(event) =>
                    setEditingMarket((prev) => (prev ? { ...prev, endDate: event.target.value } : prev))
                  }
                  className="h-11 w-full rounded-[8px] border border-white/10 bg-[#0f0f1a] px-3 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="w-full rounded-[8px] bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {isSavingEdit ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setEditingMarket(null)}
                disabled={isSavingEdit}
                className="w-full rounded-[8px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
