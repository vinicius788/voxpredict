import React, { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Edit3, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useCreateMarket } from '../hooks/useMarkets';
import { api } from '../lib/api-client';

interface AdminAIMarketGeneratorProps {
  isBrandTheme?: boolean;
}

interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  resolveBy: string;
  minBet: number;
  maxBet: number;
  tags: string[];
  rationale: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  politica: '#3B82F6',
  economia: '#8B5CF6',
  cripto: '#F59E0B',
  esportes: '#10B981',
  geopolitica: '#EF4444',
};

const categoryLabel = (raw: string) => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'politica') return 'Política';
  if (normalized === 'economia') return 'Economia';
  if (normalized === 'cripto') return 'Cripto';
  if (normalized === 'esportes') return 'Esportes';
  if (normalized === 'geopolitica') return 'Geopolítica';
  return raw;
};

const generateSuggestionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const AdminAIMarketGenerator: React.FC<AdminAIMarketGeneratorProps> = () => {
  const { isAdmin } = useAdminAccess();
  const { mutateAsync: createMarket } = useCreateMarket();
  const navigate = useNavigate();

  const [aiActive, setAiActive] = useState(true);
  const [newsText, setNewsText] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  useEffect(() => {
    const loadAiStatus = async () => {
      try {
        const response = await api.getAIStatus();
        const active = response?.active ?? response?.data?.active ?? true;
        setAiActive(Boolean(active));
      } catch {
        setAiActive(true);
      }
    };
    void loadAiStatus();
  }, []);

  const pendingCount = useMemo(() => suggestions.length, [suggestions.length]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-8 text-center">
        <Brain className="mx-auto h-12 w-12 text-[#f87171]" />
        <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Acesso restrito</h3>
        <p className="text-sm text-[var(--text-secondary)]">Apenas admins podem gerar mercados com IA.</p>
      </div>
    );
  }

  const toggleAiActive = async () => {
    const next = !aiActive;
    try {
      await api.toggleAIStatus(next);
      setAiActive(next);
      toast.success(next ? 'IA ativada.' : 'IA desativada.');
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao alterar status da IA');
    }
  };

  const generateSuggestions = async () => {
    if (!aiActive) {
      toast.error('Ative a IA antes de gerar sugestões.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.generateMarketFromAI(newsText, endDate);
      const rawSuggestions = (response?.suggestions || response?.data?.suggestions || []) as Array<{
        title?: string;
        description?: string;
        category?: string;
        resolveBy?: string;
        minBet?: number;
        maxBet?: number;
        tags?: string[];
        rationale?: string;
      }>;

      if (!rawSuggestions.length) {
        throw new Error('A IA não retornou sugestões válidas.');
      }

      const parsed = rawSuggestions.slice(0, 5).map((item, index) => ({
        id: generateSuggestionId(),
        title: (item.title || `Sugestão ${index + 1}?`).trim(),
        description: (item.description || '').trim(),
        category: (item.category || 'economia').toLowerCase(),
        resolveBy: (item.resolveBy || endDate || new Date().toISOString().slice(0, 10)).slice(0, 10),
        minBet: Number(item.minBet || 5),
        maxBet: Number(item.maxBet || 1000),
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
        rationale: (item.rationale || 'Relevante para o contexto LATAM atual.').trim(),
      }));

      setSuggestions(parsed);
      setEditingId(null);
      toast.success('5 sugestões geradas com sucesso.');
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao gerar sugestões com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const publishSuggestion = async (suggestion: AiSuggestion) => {
    setPublishingId(suggestion.id);
    try {
      await createMarket({
        question: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        tags: suggestion.tags,
        endTime: new Date(suggestion.resolveBy).toISOString(),
        minBet: suggestion.minBet,
        maxBet: suggestion.maxBet,
      });
      setSuggestions((prev) => prev.filter((item) => item.id !== suggestion.id));
      setEditingId(null);
      toast.success('Mercado publicado com sucesso.');
      navigate({ pathname: '/admin', search: '?tab=manage', hash: '#manage' });
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao publicar mercado');
    } finally {
      setPublishingId(null);
    }
  };

  const updateSuggestion = (id: string, field: keyof AiSuggestion, value: string | number | string[]) => {
    setSuggestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      }),
    );
  };

  const discardSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Gerador IA com Notícias LATAM</h2>
            <p className="text-sm text-[var(--text-secondary)]">Gera 5 mercados com rationale, prontos para curadoria rápida.</p>
          </div>

          <button
            onClick={toggleAiActive}
            className={`rounded-[999px] border px-3 py-1.5 text-xs font-semibold ${
              aiActive
                ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] text-[#6ee7b7]'
                : 'border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.2)] text-[#fca5a5]'
            }`}
          >
            {aiActive ? 'IA ativa' : 'IA inativa'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr_1fr_auto]">
          <textarea
            value={newsText}
            onChange={(event) => setNewsText(event.target.value)}
            rows={3}
            className="vp-input px-3 py-2 text-sm"
            placeholder="Opcional: cole uma notícia específica. Se vazio, a IA busca notícias do dia."
          />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="vp-input h-11 px-3 text-sm" />
          <div className="flex items-center rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 text-xs text-[var(--text-secondary)]">
            {pendingCount} sugest{pendingCount !== 1 ? 'ões' : 'ão'}
          </div>
          <button
            onClick={() => void generateSuggestions()}
            disabled={isGenerating || !aiActive}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#7C3AED,#A855F7)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? 'Gerando...' : 'Gerar com IA'}
          </button>
        </div>
      </div>

      {!suggestions.length ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-6 text-sm text-[var(--text-secondary)]">
          Nenhuma sugestão no momento. Clique em <strong className="text-[var(--text-primary)]">Gerar com IA</strong>.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const color = CATEGORY_COLORS[suggestion.category] || '#A855F7';
            const isEditing = editingId === suggestion.id;

            return (
              <article key={suggestion.id} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className="rounded-[999px] border px-2.5 py-1 text-xs font-semibold"
                    style={{
                      borderColor: color,
                      color,
                      background: `${color}22`,
                    }}
                  >
                    {categoryLabel(suggestion.category)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Resolve em {new Date(suggestion.resolveBy).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={suggestion.title}
                      onChange={(event) => updateSuggestion(suggestion.id, 'title', event.target.value)}
                      className="vp-input h-10 px-3 text-sm"
                    />
                    <textarea
                      value={suggestion.description}
                      onChange={(event) => updateSuggestion(suggestion.id, 'description', event.target.value)}
                      className="vp-input px-3 py-2 text-sm"
                      rows={3}
                    />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input
                        value={suggestion.category}
                        onChange={(event) => updateSuggestion(suggestion.id, 'category', event.target.value)}
                        className="vp-input h-10 px-3 text-sm"
                      />
                      <input
                        type="date"
                        value={suggestion.resolveBy}
                        onChange={(event) => updateSuggestion(suggestion.id, 'resolveBy', event.target.value)}
                        className="vp-input h-10 px-3 text-sm"
                      />
                      <input
                        value={suggestion.tags.join(', ')}
                        onChange={(event) =>
                          updateSuggestion(
                            suggestion.id,
                            'tags',
                            event.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          )
                        }
                        className="vp-input h-10 px-3 text-sm"
                        placeholder="tags"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{suggestion.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{suggestion.description}</p>
                    <p className="mt-3 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2 text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Rationale:</strong> {suggestion.rationale}
                    </p>
                  </>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void publishSuggestion(suggestion)}
                    disabled={publishingId === suggestion.id}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-3 py-2 text-xs font-semibold text-[#6ee7b7] disabled:opacity-60"
                  >
                    {publishingId === suggestion.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Publicar
                  </button>
                  <button
                    onClick={() => setEditingId((prev) => (prev === suggestion.id ? null : suggestion.id))}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.18)] px-3 py-2 text-xs font-semibold text-[#bfdbfe]"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? 'Fechar edição' : 'Editar'}
                  </button>
                  <button
                    onClick={() => discardSuggestion(suggestion.id)}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.16)] px-3 py-2 text-xs font-semibold text-[#fca5a5]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Descartar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
