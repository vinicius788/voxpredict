import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, CircleDot, Loader2, Save, Sparkles, Trash2, XCircle, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useCreateMarket } from '../hooks/useMarkets';
import { MarketCard } from './MarketCard';
import { type Market } from '../types';
import { api } from '../lib/api-client';

interface AdminAIMarketGeneratorProps {
  isBrandTheme?: boolean;
}

interface CategoryOption {
  id: string;
  label: string;
}

interface GeneratedDraft {
  question: string;
  description: string;
  category: string;
  endDate: string;
  tags: string[];
}

type Step = 1 | 2 | 3 | 4;
type GenerationStatus = 'publicado' | 'rascunho' | 'descartado';

interface HistoryEntry {
  id: string;
  status: GenerationStatus;
  title: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'política', label: 'Política' },
  { id: 'cripto', label: 'Cripto' },
  { id: 'economia', label: 'Economia' },
  { id: 'esportes', label: 'Esportes' },
  { id: 'tecnologia', label: 'Tecnologia' },
];

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const formatTimeAgo = (isoDate: string) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

export const AdminAIMarketGenerator: React.FC<AdminAIMarketGeneratorProps> = ({ isBrandTheme = false }) => {
  const { isAdmin } = useAdminAccess();
  const { mutateAsync: createMarket, isPending } = useCreateMarket();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [aiActive, setAiActive] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [newsText, setNewsText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0].id);
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const themeClasses = {
    cardBg: isBrandTheme ? 'bg-gray-800' : 'bg-white',
    text: isBrandTheme ? 'text-white' : 'text-gray-900',
    textSecondary: isBrandTheme ? 'text-gray-300' : 'text-gray-600',
    border: isBrandTheme ? 'border-gray-700' : 'border-gray-200',
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [statusResponse, categoriesResponse] = await Promise.all([
          api.getAIStatus(),
          api.getCategories(),
        ]);

        const aiStatus = statusResponse?.active ?? statusResponse?.data?.active ?? true;
        setAiActive(Boolean(aiStatus));

        const categoriesData = (categoriesResponse?.data || categoriesResponse) as Array<{
          key?: string;
          label: string;
          active?: boolean;
        }>;

        const nextCategories = categoriesData
          .filter((category) => category.active !== false)
          .map((category) => ({
            id: category.key || normalizeText(category.label).toLowerCase(),
            label: category.label,
          }));

        if (nextCategories.length) {
          setCategories(nextCategories);
          setSelectedCategory((prev) => (nextCategories.some((item) => item.id === prev) ? prev : nextCategories[0].id));
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadConfig();
  }, []);

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((category) => category.id === selectedCategory)?.label || 'Categoria';
  }, [categories, selectedCategory]);

  const previewMarket = useMemo<Market | null>(() => {
    if (!draft) return null;

    return {
      id: 'ai-preview-market',
      title: draft.question || 'Título do mercado',
      description: draft.description || 'Descrição do mercado',
      category: categories.find((category) => category.id === draft.category)?.label || draft.category,
      endDate: draft.endDate,
      totalVolume: 38420,
      totalBettors: 152,
      simOdds: 2.0,
      naoOdds: 2.0,
      simProbability: 50,
      naoProbability: 50,
      status: 'active',
      tags: draft.tags,
    };
  }, [categories, draft]);

  const addToHistory = (status: GenerationStatus, title: string) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status,
      title,
      createdAt: new Date().toISOString(),
    };

    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
  };

  const toggleAiActive = async () => {
    const next = !aiActive;
    try {
      await api.toggleAIStatus(next);
      setAiActive(next);
      toast.success(next ? 'IA ativada.' : 'IA desativada.');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao atualizar status da IA.');
    }
  };

  const handleGenerate = async () => {
    if (!aiActive) {
      toast.error('Ative a IA para usar este recurso.');
      return;
    }

    if (!normalizeText(newsText)) {
      toast.error('Insira o texto da notícia.');
      return;
    }

    if (!endDate) {
      toast.error('Selecione a data de encerramento.');
      return;
    }

    setCurrentStep(2);
    setIsGenerating(true);

    try {
      const result = await api.generateMarketFromAI(newsText, endDate);
      const market = result?.market || result?.data?.market || result?.data || result;

      setDraft({
        question: market?.question || 'Mercado gerado por IA?',
        description: market?.description || 'Sem descrição',
        category: market?.category || selectedCategory,
        endDate,
        tags: Array.isArray(market?.tags) ? market.tags : [],
      });

      setCurrentStep(3);
      toast.success('Mercado gerado. Revise antes de publicar.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erro ao gerar mercado');
      setCurrentStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;

    try {
      const response = await createMarket({
        question: draft.question,
        description: draft.description,
        category: draft.category,
        tags: draft.tags,
        endTime: new Date(draft.endDate).toISOString(),
        minBet: 5,
        maxBet: 1000,
      });

      const createdMarket = response?.data || response?.market || response;
      if (!createdMarket?.id) throw new Error('Falha ao publicar');

      setCurrentStep(4);
      addToHistory('publicado', draft.question);
      toast.success('Mercado publicado com sucesso.');

      setTimeout(() => {
        setDraft(null);
        setNewsText('');
        setEndDate('');
        setCurrentStep(1);
        navigate({ pathname: '/admin', search: '?tab=manage', hash: '#manage' });
      }, 900);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao publicar mercado.');
    }
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    addToHistory('rascunho', draft.question);
    toast.success('Rascunho salvo no histórico.');
  };

  const handleDiscard = () => {
    if (!draft) return;
    addToHistory('descartado', draft.question);
    setDraft(null);
    setCurrentStep(1);
    toast.success('Geração descartada.');
  };

  const steps = [
    { id: 1, label: 'Notícia' },
    { id: 2, label: 'Gerando' },
    { id: 3, label: 'Revisar' },
    { id: 4, label: 'Publicar' },
  ] as const;

  if (!isAdmin) {
    return (
      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-8 text-center`}>
        <div className="text-red-500 mb-4">
          <Brain className="w-16 h-16 mx-auto" />
        </div>
        <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>Acesso Negado</h3>
        <p className={themeClasses.textSecondary}>Apenas administradores podem acessar o gerador IA.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${themeClasses.text}`}>Gerador de Mercados com IA</h2>
              <p className={`text-sm ${themeClasses.textSecondary}`}>1. Notícia → 2. Geração → 3. Revisão → 4. Publicação</p>
            </div>
          </div>

          <button
            onClick={toggleAiActive}
            className={`inline-flex items-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-semibold transition-colors ${
              aiActive
                ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]'
                : 'border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.16)] text-[#fda4af]'
            }`}
          >
            <span>{aiActive ? '🟢 IA ATIVADA' : '🔴 IA DESATIVADA'}</span>
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {steps.map((step, index) => {
            const completed = currentStep > step.id;
            const active = currentStep === step.id;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`inline-flex items-center gap-2 rounded-[999px] border px-3 py-1.5 text-xs font-semibold ${
                    completed
                      ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]'
                      : active
                        ? 'border-[rgba(124,58,237,0.58)] bg-[rgba(124,58,237,0.28)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'
                  }`}
                >
                  {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                  {step.id}. {step.label}
                </div>
                {index < steps.length - 1 && <span className="text-[var(--text-muted)]">→</span>}
              </React.Fragment>
            );
          })}
        </div>

        <div className="relative rounded-[12px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
          {!aiActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[12px] bg-[rgba(13,11,26,0.72)]">
              <p className="rounded-[10px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-4 py-2 text-sm font-medium text-[#fecaca]">
                Ative a IA para usar este recurso.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Notícia</label>
              <textarea
                value={newsText}
                onChange={(event) => setNewsText(event.target.value)}
                placeholder="Cole a notícia aqui..."
                rows={6}
                className="vp-input px-3 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">{newsText.length}/4000</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="vp-input h-10 px-3 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Data de encerramento</label>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="vp-input h-10 px-3 text-sm" />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!aiActive || isGenerating || isPending}
                className="vp-btn-primary inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {currentStep === 2 && (
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
          <div className="flex items-center gap-3 text-[var(--text-primary)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
            <p className="text-sm">Gerando proposta de mercado com base na notícia...</p>
          </div>
        </div>
      )}

      {draft && (
        <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Revisar Mercado Gerado</h3>
            <span className="rounded-full border border-[rgba(124,58,237,0.5)] bg-[rgba(124,58,237,0.18)] px-2.5 py-1 text-xs font-semibold text-[#d8b4fe]">
              Step 3
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Pergunta
                </label>
                <input
                  value={draft.question}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, question: event.target.value } : prev))}
                  className="vp-input h-10 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Descrição
                </label>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                  rows={4}
                  className="vp-input px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Categoria
                  </label>
                  <select
                    value={draft.category}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, category: event.target.value } : prev))}
                    className="vp-input h-10 px-3 text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Data
                  </label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, endDate: event.target.value } : prev))}
                    className="vp-input h-10 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Tags
                </label>
                <input
                  value={draft.tags.join(', ')}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: event.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          }
                        : prev,
                    )
                  }
                  className="vp-input h-10 px-3 text-sm"
                  placeholder="Ex: Bitcoin, Política"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Preview Público</p>
              {previewMarket && (
                <MarketCard
                  market={previewMarket}
                  isBrandTheme={true}
                  isFavorited={false}
                  onSelect={() => {}}
                  onToggleFavorite={() => {}}
                  onShare={() => {}}
                />
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-4 py-2 text-sm font-semibold text-[#6ee7b7] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Publicar Agora
            </button>
            <button onClick={handleSaveDraft} className="vp-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <Save className="h-4 w-4" /> Salvar Rascunho
            </button>
            <button onClick={handleGenerate} className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(124,58,237,0.55)] px-4 py-2 text-sm font-semibold text-[#c4b5fd]">
              <Sparkles className="h-4 w-4" /> Gerar Novamente
            </button>
            <button
              onClick={handleDiscard}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.12)] px-4 py-2 text-sm font-semibold text-[#fca5a5]"
            >
              <Trash2 className="h-4 w-4" /> Descartar
            </button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="rounded-[12px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] p-4 text-sm text-[#a7f3d0]">
          <p className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Mercado publicado com sucesso.
          </p>
        </div>
      )}

      <div className={`${themeClasses.cardBg} rounded-2xl shadow-sm border ${themeClasses.border} p-6`}>
        <h3 className={`text-lg font-semibold ${themeClasses.text} mb-3`}>📋 Últimas Gerações</h3>

        {history.length === 0 ? (
          <p className={`text-sm ${themeClasses.textSecondary}`}>Nenhuma geração registrada.</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => {
              const statusStyles: Record<GenerationStatus, string> = {
                publicado: 'text-[#6ee7b7]',
                rascunho: 'text-[#c4b5fd]',
                descartado: 'text-[#fca5a5]',
              };

              const StatusIcon = entry.status === 'publicado' ? CheckCircle2 : entry.status === 'rascunho' ? Save : XCircle;

              return (
                <div key={entry.id} className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
                  <div className="min-w-0">
                    <p className={`inline-flex items-center gap-2 text-sm font-medium ${statusStyles[entry.status]}`}>
                      <StatusIcon className="h-4 w-4" />
                      {entry.status === 'publicado' ? 'Publicado' : entry.status === 'rascunho' ? 'Rascunho' : 'Descartado'}
                    </p>
                    <p className="line-clamp-1 text-sm text-[var(--text-primary)]">{entry.title}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{formatTimeAgo(entry.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[12px] border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#bfdbfe]">
          <Zap className="h-4 w-4" /> Fluxo recomendado
        </p>
        <p className="mt-1 text-xs text-[#93c5fd]">
          Cole a notícia, gere com IA, revise no preview e publique. Categoria atual selecionada: {selectedCategoryLabel}.
        </p>
      </div>
    </div>
  );
};
