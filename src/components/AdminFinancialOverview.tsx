import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Market } from '../types';
import { useMarkets } from '../hooks/useMarkets';
import { useAdminStats, useFinancialOverview } from '../hooks/useAdminData';

interface AdminFinancialOverviewProps {
  isBrandTheme?: boolean;
}

type PeriodKey = 'day' | 'week' | 'month' | 'longTerm';

const FEE_RATE = 0.03;

const categoryColors: Record<string, string> = {
  cripto: '#F97316',
  politica: '#3B82F6',
  economia: '#10B981',
  esportes: '#EF4444',
  tecnologia: '#8B5CF6',
};

const normalizeCategory = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const classifyPeriod = (market: Market): PeriodKey => {
  const diff = new Date(market.endDate).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days <= 1) return 'day';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'longTerm';
};

export const AdminFinancialOverview: React.FC<AdminFinancialOverviewProps> = () => {
  const navigate = useNavigate();
  const { data: marketsResponse } = useMarkets({ limit: 200, includeAll: true });
  const { data: adminStats } = useAdminStats();
  const { data: financialOverview } = useFinancialOverview();

  const marketRows = useMemo(() => {
    const markets = marketsResponse?.markets || [];

    return markets.map((market) => {
      const projectedVolume = market.estimatedVolume || market.totalVolume;
      const revenue = projectedVolume * FEE_RATE;
      const period = classifyPeriod(market);

      return {
        id: market.id,
        title: market.title,
        category: market.category,
        endDate: market.endDate,
        participants: market.totalBettors,
        volume: projectedVolume,
        revenue,
        period,
      };
    });
  }, [marketsResponse?.markets]);

  const totalRevenue = Number(financialOverview?.totalProjectedRevenue ?? marketRows.reduce((sum, row) => sum + row.revenue, 0));

  const periodGroups: Record<PeriodKey, typeof marketRows> = {
    day: marketRows.filter((row) => row.period === 'day'),
    week: marketRows.filter((row) => row.period === 'week'),
    month: marketRows.filter((row) => row.period === 'month'),
    longTerm: marketRows.filter((row) => row.period === 'longTerm'),
  };

  const periodStats = {
    day: Number(financialOverview?.sections?.day?.revenue ?? periodGroups.day.reduce((sum, row) => sum + row.revenue, 0)),
    week: Number(financialOverview?.sections?.week?.revenue ?? periodGroups.week.reduce((sum, row) => sum + row.revenue, 0)),
    month: Number(financialOverview?.sections?.month?.revenue ?? periodGroups.month.reduce((sum, row) => sum + row.revenue, 0)),
    longTerm: Number(financialOverview?.sections?.longTerm?.revenue ?? periodGroups.longTerm.reduce((sum, row) => sum + row.revenue, 0)),
  };

  const categoryDistribution = useMemo(() => {
    const byCategory = financialOverview?.byCategory as Record<string, number> | undefined;
    if (byCategory && Object.keys(byCategory).length > 0) {
      return Object.entries(byCategory).map(([category, value]) => ({
        category,
        value: Number(value),
        percentage: totalRevenue ? (Number(value) / totalRevenue) * 100 : 0,
      }));
    }

    const grouped = new Map<string, number>();

    marketRows.forEach((row) => {
      const key = row.category;
      grouped.set(key, (grouped.get(key) || 0) + row.revenue);
    });

    return Array.from(grouped.entries()).map(([category, value]) => ({
      category,
      value,
      percentage: totalRevenue ? (value / totalRevenue) * 100 : 0,
    }));
  }, [marketRows, totalRevenue]);

  const projectedBreakdown = {
    Cripto: categoryDistribution.find((item) => normalizeCategory(item.category) === 'cripto')?.percentage || 0,
    Política: categoryDistribution.find((item) => normalizeCategory(item.category) === 'politica')?.percentage || 0,
    Economia: categoryDistribution.find((item) => normalizeCategory(item.category) === 'economia')?.percentage || 0,
  };

  const toNumber = (value: unknown) => Number(value ?? 0);
  const revenueStats = {
    day: toNumber(adminStats?.revenueToday ?? periodStats.day),
    week: toNumber(adminStats?.revenueWeek ?? periodStats.week),
    month: toNumber(adminStats?.revenueMonth ?? periodStats.month),
    total: toNumber(adminStats?.revenueTotal ?? totalRevenue),
    projected: toNumber(adminStats?.projectedRevenue ?? totalRevenue),
    cryptoShare: toNumber(adminStats?.cryptoShare ?? projectedBreakdown.Cripto),
    politicsShare: toNumber(adminStats?.politicsShare ?? projectedBreakdown.Política),
    economyShare: toNumber(adminStats?.economyShare ?? projectedBreakdown.Economia),
  };

  const exportCsv = () => {
    const headers = ['ID', 'Mercado', 'Categoria', 'Volume', 'Receita', 'Participantes', 'Encerramento', '% do Total'];
    const rows = marketRows.map((row) => [
      row.id,
      `"${row.title.replace(/"/g, '""')}"`,
      row.category,
      row.volume.toFixed(2),
      row.revenue.toFixed(2),
      String(row.participants),
      new Date(row.endDate).toLocaleDateString('pt-BR'),
      totalRevenue ? ((row.revenue / totalRevenue) * 100).toFixed(2) : '0.00',
    ]);

    const csv = [headers, ...rows].map((line) => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voxpredict-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: 'HOJE', value: revenueStats.day, trend: 4.2 },
    { label: 'ESTA SEMANA', value: revenueStats.week, trend: 8.6 },
    { label: 'ESTE MÊS', value: revenueStats.month, trend: 11.3 },
    { label: 'TOTAL', value: revenueStats.total, trend: -2.1 },
  ];

  const renderTableSection = (label: string, rows: typeof marketRows) => {
    const sectionTotal = rows.reduce((sum, row) => sum + row.revenue, 0);

    return (
      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold text-gray-400">{label}</h4>
        <div className="overflow-x-auto rounded-[10px] border border-white/10">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-[#0f0f1a] text-left text-xs uppercase tracking-[0.08em] text-gray-500">
              <tr>
                <th className="px-3 py-2.5">Mercado</th>
                <th className="px-3 py-2.5">Categoria</th>
                <th className="px-3 py-2.5">Volume</th>
                <th className="px-3 py-2.5">Receita</th>
                <th className="px-3 py-2.5">% do Total</th>
                <th className="px-3 py-2.5">Participantes</th>
                <th className="px-3 py-2.5">Encerramento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => navigate(`/market/${row.id}`)}
                      className="line-clamp-1 max-w-[320px] text-left text-white hover:underline"
                    >
                      {row.title}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-300">{row.category}</td>
                  <td className="mono-value px-3 py-2.5 text-gray-300">{formatCurrency(row.volume)}</td>
                  <td className="mono-value px-3 py-2.5 text-[#34d399]">{formatCurrency(row.revenue)}</td>
                  <td className="mono-value px-3 py-2.5 text-gray-300">
                    {totalRevenue ? ((row.revenue / totalRevenue) * 100).toFixed(2) : '0.00'}%
                  </td>
                  <td className="mono-value px-3 py-2.5 text-gray-300">{row.participants}</td>
                  <td className="mono-value px-3 py-2.5 text-gray-300">{new Date(row.endDate).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-[#0f0f1a] text-xs text-gray-300">
                <td className="px-3 py-2.5 font-semibold text-white">TOTAL</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="mono-value px-3 py-2.5 text-[#fbbf24]">{formatCurrency(sectionTotal)}</td>
                <td className="mono-value px-3 py-2.5">{totalRevenue ? ((sectionTotal / totalRevenue) * 100).toFixed(2) : '0.00'}%</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Visão Financeira</h2>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[10px] border border-white/10 bg-[#1e1e30] p-4"
            >
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">{card.label}</p>
              <p className="mono-value mt-2 text-2xl font-bold text-white">{formatCurrency(card.value)}</p>
              <p className={`mt-2 inline-flex items-center gap-1 text-xs ${card.trend >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                {card.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(card.trend).toFixed(1)}% vs período anterior
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[10px] border border-white/10 bg-[#1e1e30] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Receita Total Projetada</p>
          <p className="mono-value mt-2 text-4xl font-bold text-amber-400">{formatCurrency(revenueStats.projected)}</p>
          <p className="mt-2 text-sm text-gray-300">
            Cripto: {revenueStats.cryptoShare.toFixed(0)}% | Política: {revenueStats.politicsShare.toFixed(0)}% | Economia: {revenueStats.economyShare.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        <h3 className="mb-3 text-lg font-semibold text-white">Distribuição de Receita por Categoria</h3>
        <div className="flex flex-col items-center justify-center gap-5 lg:flex-row lg:items-center">
          <div className="h-[280px] w-full max-w-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={98}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={900}
                  animationBegin={120}
                >
                  {categoryDistribution.map((entry) => (
                    <Cell key={entry.category} fill={categoryColors[normalizeCategory(entry.category)] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as { category: string; value: number; percentage: number };

                    return (
                      <div className="rounded-[10px] border border-white/10 bg-[#0f0f1a] px-3 py-2 text-xs text-white shadow-lg">
                        <p className="font-semibold">{row.category}</p>
                        <p className="mono-value text-gray-300">{formatCurrency(row.value)}</p>
                        <p className="mono-value text-gray-300">{row.percentage.toFixed(1)}%</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full max-w-[360px] space-y-2">
            {categoryDistribution.map((item) => {
              const color = categoryColors[normalizeCategory(item.category)] || '#94A3B8';
              return (
                <div key={item.category} className="flex items-center justify-between rounded-[10px] border border-white/10 bg-[#0f0f1a] px-3 py-2">
                  <div className="inline-flex items-center gap-2 text-sm text-white">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {item.category}
                  </div>
                  <div className="text-right">
                    <p className="mono-value text-xs text-gray-300">{item.percentage.toFixed(1)}%</p>
                    <p className="mono-value text-xs text-white">{formatCurrency(item.value)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        {renderTableSection('Operações do Dia', periodGroups.day)}
        {renderTableSection('Operações da Semana', periodGroups.week)}
        {renderTableSection('Operações do Mês', periodGroups.month)}
        {renderTableSection('Operações de Longo Prazo', periodGroups.longTerm)}
      </div>
    </div>
  );
};
