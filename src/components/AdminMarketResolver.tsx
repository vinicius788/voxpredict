import React, { useMemo, useState } from 'react';
import { CheckCircle, Clock, DollarSign, Users, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Market } from '../types';
import { useMarkets, useResolveMarket } from '../hooks/useMarkets';

interface AdminMarketResolverProps {
  isBrandTheme?: boolean;
}

type ResolutionLog = {
  id: string;
  marketId: string;
  marketTitle: string;
  result: 'SIM' | 'NÃO';
  distributedValue: number;
  timestamp: string;
  adminEmail: string;
};

export const AdminMarketResolver: React.FC<AdminMarketResolverProps> = ({ isBrandTheme = false }) => {
  const { data: pendingMarketsResponse, refetch: refetchPending } = useMarkets({
    status: 'ACTIVE',
    sortBy: 'ending',
    limit: 200,
  });
  const { data: resolvedMarketsResponse, refetch: refetchResolved } = useMarkets({
    status: 'RESOLVED',
    sortBy: 'resolvedAt',
    limit: 50,
  });
  const { mutateAsync: resolveMarket } = useResolveMarket();

  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedResult, setSelectedResult] = useState<'SIM' | 'NÃO' | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  const pendingMarkets = useMemo(() => pendingMarketsResponse?.markets || [], [pendingMarketsResponse?.markets]);
  const resolvedMarkets = useMemo(() => resolvedMarketsResponse?.markets || [], [resolvedMarketsResponse?.markets]);

  const expiredMarkets = useMemo(() => {
    const now = Date.now();

    return pendingMarkets.filter((market) => {
      const ended = new Date(market.endDate).getTime() <= now;
      return ended && market.status === 'active';
    });
  }, [pendingMarkets]);

  const resolutionLogs = useMemo<ResolutionLog[]>(() => {
    return [...resolvedMarkets]
      .sort((a, b) => {
        const aTimestamp = new Date(a.resolvedAt || a.endDate).getTime();
        const bTimestamp = new Date(b.resolvedAt || b.endDate).getTime();
        return bTimestamp - aTimestamp;
      })
      .map((market, index) => ({
        id: `${market.id}-${index}`,
        marketId: market.id,
        marketTitle: market.title,
        result: market.outcome === 'YES' ? 'SIM' : 'NÃO',
        distributedValue: Number((market.totalVolume * 0.97).toFixed(2)),
        timestamp: new Date(market.resolvedAt || market.endDate).toISOString(),
        adminEmail: 'vm****@gmail.com',
      }));
  }, [resolvedMarkets]);

  const estimateDistribution = (market: Market) => {
    const winners = Math.max(1, Math.round(market.totalBettors * 0.52));
    const losers = Math.max(1, market.totalBettors - winners);
    const distributable = market.totalVolume * 0.97;
    return { winners, losers, distributable };
  };

  const openResolveModal = (market: Market, result: 'SIM' | 'NÃO') => {
    setSelectedMarket(market);
    setSelectedResult(result);
  };

  const confirmResolve = async () => {
    if (!selectedMarket || !selectedResult) return;
    const estimate = estimateDistribution(selectedMarket);

    setResolvingId(selectedMarket.id);

    try {
      await resolveMarket({
        id: Number(selectedMarket.id),
        outcome: selectedResult === 'SIM' ? 'YES' : 'NO',
      });

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1600);

      await Promise.all([refetchPending(), refetchResolved()]);
      toast.success(`Mercado resolvido! $${estimate.distributable.toFixed(2)} distribuído.`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao resolver mercado.');
    } finally {
      setResolvingId(null);
      setSelectedMarket(null);
      setSelectedResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <h2 className={`text-xl font-semibold ${themeClasses.text}`}>Resolver Mercados</h2>
        <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>Finalize mercados encerrados com confirmação obrigatória.</p>

        <div className={`${isBrandTheme ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border mt-4`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{expiredMarkets.length} mercado(s) aguardando resolução</span>
          </div>
        </div>
      </div>

      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        {expiredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className={`w-16 h-16 ${themeClasses.textSecondary} mx-auto mb-4`} />
            <h4 className={`text-lg font-semibold ${themeClasses.text}`}>Todos resolvidos</h4>
            <p className={`text-sm ${themeClasses.textSecondary}`}>Nenhum mercado pendente no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expiredMarkets.map((market) => {
              const estimate = estimateDistribution(market);

              return (
                <article key={market.id} className={`border ${themeClasses.border} rounded-xl p-4`}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className={`font-semibold ${themeClasses.text}`}>{market.title}</h4>
                      <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                        Volume: ${market.totalVolume.toLocaleString()} · {market.totalBettors} participantes
                      </p>
                      <p className="text-xs text-amber-400 mt-1">Encerrou em {new Date(market.endDate).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openResolveModal(market, 'SIM')}
                        disabled={resolvingId === market.id}
                        className="rounded-[8px] bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Resolver como SIM
                      </button>
                      <button
                        onClick={() => openResolveModal(market, 'NÃO')}
                        disabled={resolvingId === market.id}
                        className="rounded-[8px] bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        ❌ Resolver como NÃO
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[var(--text-secondary)]">
                    <div className="rounded-[8px] border border-[var(--border)] p-2">
                      <p className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Ganhadores estimados</p>
                      <p className="mono-value text-[var(--text-primary)] mt-1">{estimate.winners}</p>
                    </div>
                    <div className="rounded-[8px] border border-[var(--border)] p-2">
                      <p className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Perdedores estimados</p>
                      <p className="mono-value text-[var(--text-primary)] mt-1">{estimate.losers}</p>
                    </div>
                    <div className="rounded-[8px] border border-[var(--border)] p-2">
                      <p className="inline-flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Valor distribuído</p>
                      <p className="mono-value text-[var(--text-primary)] mt-1">${estimate.distributable.toFixed(2)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Log de Resoluções</h3>

        {resolutionLogs.length === 0 ? (
          <p className={`text-sm ${themeClasses.textSecondary}`}>Nenhuma resolução registrada ainda.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {resolutionLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="rounded-[8px] border border-[var(--border)] p-2 text-xs text-[var(--text-secondary)]">
                <p className="text-[var(--text-primary)]">{log.marketTitle}</p>
                <p>
                  Resultado: <span className={log.result === 'SIM' ? 'text-[#34d399]' : 'text-[#f87171]'}>{log.result}</span> · Distribuído: <span className="mono-value">${log.distributedValue.toFixed(2)}</span>
                </p>
                <p>{new Date(log.timestamp).toLocaleString('pt-BR')} · {log.adminEmail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMarket && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className={`${themeClasses.cardBg} w-full max-w-lg rounded-2xl border ${themeClasses.border} p-6`}>
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Confirmar resolução irreversível</h3>
            <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>{selectedMarket.title}</p>

            {(() => {
              const estimate = estimateDistribution(selectedMarket);
              return (
                <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]">
                  <p>Resultado escolhido: <span className={selectedResult === 'SIM' ? 'text-[#34d399]' : 'text-[#f87171]'}>{selectedResult}</span></p>
                  <p className="mt-1">Impacto estimado: {estimate.winners} ganham, {estimate.losers} perdem.</p>
                  <p className="mono-value mt-1">Valor distribuído estimado: ${estimate.distributable.toFixed(2)}</p>
                </div>
              );
            })()}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setSelectedMarket(null);
                  setSelectedResult(null);
                }}
                className="w-full rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResolve}
                className="w-full rounded-[8px] bg-[rgba(245,158,11,0.9)] px-4 py-2 text-sm font-semibold text-white"
              >
                Confirmar resolução
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={`confetti-${index}`}
              className="absolute text-xl animate-bounce"
              style={{
                left: `${5 + index * 5}%`,
                top: `${5 + (index % 4) * 8}%`,
                animationDuration: `${0.7 + (index % 5) * 0.25}s`,
              }}
            >
              {index % 2 === 0 ? '🎉' : '✨'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
