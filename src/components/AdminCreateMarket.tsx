import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { type Market } from '../types';
import { useCreateMarket } from '../hooks/useMarkets';
import { api } from '../lib/api-client';
import { usePolymarketMarketSuggestions } from '../hooks/usePolymarket';
import './AdminCreateMarket.css';

interface MarketOption {
  id: string;
  text: string;
}

interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface AdminCreateMarketProps {
  isBrandTheme?: boolean;
  onMarketCreated?: (marketAddress: string) => void;
  adminEmail?: string;
}

const categoryPalette: Record<string, string> = {
  politica: '#3B82F6',
  cripto: '#F59E0B',
  esportes: '#10B981',
  economia: '#8B5CF6',
  tecnologia: '#06B6D4',
  entretenimento: '#EC4899',
  geopolitica: '#EF4444',
  negocios: '#14B8A6',
  ciencia: '#6366F1',
};

const questionPlaceholders: Record<string, string> = {
  politica: 'Ex: O governo vai aprovar a reforma tributária até junho de 2026?',
  cripto: 'Ex: O Bitcoin vai ultrapassar $150.000 antes do fim de 2026?',
  esportes: 'Ex: O Brasil vai vencer a Copa América 2026?',
  economia: 'Ex: A Selic ficará abaixo de 9% até dezembro de 2026?',
  tecnologia: 'Ex: A OpenAI lançará um novo modelo multimodal este ano?',
  entretenimento: 'Ex: O filme X será o maior bilheteria do ano?',
  geopolitica: 'Ex: O país X assinará acordo comercial até novembro de 2026?',
};

const normalizeCategoryId = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');

const getCategoryColor = (id: string) => categoryPalette[normalizeCategoryId(id)] || '#A855F7';

const getMinDateTime = () => {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return twentyFourHoursFromNow.toISOString().slice(0, 16);
};

export const AdminCreateMarket: React.FC<AdminCreateMarketProps> = ({
  onMarketCreated,
  adminEmail = 'vm3441896@gmail.com',
}) => {
  const navigate = useNavigate();
  const { mutateAsync: createMarket, isPending } = useCreateMarket();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('política');
  const [options, setOptions] = useState<MarketOption[]>([
    { id: '1', text: 'SIM' },
    { id: '2', text: 'NÃO' },
  ]);
  const [closingTime, setClosingTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [minBetAmount, setMinBetAmount] = useState('5');
  const [maxBetAmount, setMaxBetAmount] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSuggestionQuery(question.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [question]);

  const { data: polymarketSuggestions = [] } = usePolymarketMarketSuggestions(suggestionQuery, 3);

  useEffect(() => {
    const loadCategories = async () => {
      const defaults: CategoryItem[] = [
        { id: 'política', label: 'Política', icon: '', color: getCategoryColor('política') },
        { id: 'cripto', label: 'Cripto', icon: '₿', color: getCategoryColor('cripto') },
        { id: 'esportes', label: 'Esportes', icon: '', color: getCategoryColor('esportes') },
        { id: 'economia', label: 'Economia', icon: '', color: getCategoryColor('economia') },
        { id: 'tecnologia', label: 'Tecnologia', icon: '', color: getCategoryColor('tecnologia') },
        { id: 'entretenimento', label: 'Entretenimento', icon: '', color: getCategoryColor('entretenimento') },
        { id: 'geopolítica', label: 'Geopolítica', icon: '', color: getCategoryColor('geopolítica') },
      ];

      try {
        const response = await api.getCategories();
        const parsed = (response.data || response) as Array<{
          key?: string;
          label: string;
          icon?: string;
          active?: boolean;
        }>;

        const activeOnly = parsed
          .filter((item) => item.active !== false)
          .map((item) => {
            const id = item.key || item.label.toLowerCase();
            return {
              id,
              label: item.label,
              icon: item.icon || '',
              color: getCategoryColor(id),
            };
          });

        setCategories(activeOnly.length ? activeOnly : defaults);
      } catch (error) {
        console.error(error);
        setCategories(defaults);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((item) => item.id === category)) {
      setCategory(categories[0].id);
    }
  }, [categories, category]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === category) || null,
    [categories, category],
  );

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (!question.trim()) next.question = 'Pergunta principal é obrigatória.';
    if (!description.trim()) next.description = 'Descrição é obrigatória.';
    if (!category) next.category = 'Selecione uma categoria.';
    if (!closingTime) next.closingTime = 'Data de encerramento é obrigatória.';

    const closingDate = closingTime ? new Date(closingTime) : null;
    if (closingDate && Number.isFinite(closingDate.getTime())) {
      const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (closingDate <= minDate) next.closingTime = 'Mercado deve encerrar ao menos 24h no futuro.';
    }

    if (options.some((option) => !option.text.trim())) {
      next.options = 'Preencha todas as opções de resposta.';
    }

    const minBet = Number(minBetAmount);
    const maxBet = Number(maxBetAmount);

    if (!Number.isFinite(minBet) || minBet < 1) next.minBet = 'Mínimo deve ser ao menos $1.';
    if (!Number.isFinite(maxBet) || maxBet <= minBet) next.maxBet = 'Máximo deve ser maior que o mínimo.';

    return next;
  }, [category, closingTime, description, maxBetAmount, minBetAmount, options, question]);

  const hasErrors = Object.keys(errors).length > 0;

  const completeness = useMemo(() => {
    let filled = 0;
    const total = 5;

    if (question.trim().length > 10) filled++;
    if (description.trim().length > 20) filled++;
    if (category) filled++;
    if (closingTime) filled++;

    const minBet = Number(minBetAmount);
    const maxBet = Number(maxBetAmount);
    if (Number.isFinite(minBet) && Number.isFinite(maxBet) && minBet > 0 && maxBet > minBet) {
      filled++;
    }

    return Math.round((filled / total) * 100);
  }, [category, closingTime, description, maxBetAmount, minBetAmount, question]);

  const daysUntilClose = useMemo(() => {
    if (!closingTime) return null;
    const diff = new Date(closingTime).getTime() - Date.now();
    if (!Number.isFinite(diff) || diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [closingTime]);

  const questionPlaceholder =
    questionPlaceholders[normalizeCategoryId(category)] ||
    'Ex: O governo vai aprovar a reforma tributária até junho de 2026?';

  const questionCounterClass =
    question.length > 180 ? 'counter-danger' : question.length >= 150 ? 'counter-warn' : 'counter-good';

  const descriptionCounterClass =
    description.length > 1100 ? 'counter-danger' : description.length >= 900 ? 'counter-warn' : 'counter-good';

  const previewColor = selectedCategory?.color || '#A855F7';
  const isFormReady = completeness === 100 && !hasErrors;
  const showFieldError = (key: string) => (hasAttemptedSubmit && errors[key] ? errors[key] : '');

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { id: String(Date.now()), text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      toast.error('Mínimo de 2 opções necessárias.');
      return;
    }

    setOptions((prev) => prev.filter((option) => option.id !== id));
  };

  const handleOptionChange = (id: string, value: string) => {
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text: value } : option)));
  };

  const handleAddTag = (value?: string) => {
    const normalizedTag = (value ?? newTag).trim();
    if (!normalizedTag || tags.includes(normalizedTag)) return;
    setTags((prev) => [...prev, normalizedTag]);
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);

    if (hasErrors) {
      toast.error('Revise os campos destacados antes de publicar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const marketData = {
        question: question.trim(),
        description: description.trim(),
        endTime: new Date(closingTime).toISOString(),
        minBet: Number(minBetAmount),
        maxBet: Number(maxBetAmount),
        category,
        tags,
      };

      toast.loading('Criando mercado na blockchain...', { id: 'create-market' });

      const response = await createMarket(marketData);
      const createdMarket = response?.data || response?.market || response;
      const createdId = createdMarket?.id ? String(createdMarket.id) : '';

      if (!createdId) {
        throw new Error('Falha ao criar mercado');
      }

      toast.success('Mercado criado com sucesso!', { id: 'create-market' });

      if (onMarketCreated) onMarketCreated(createdId);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('marketsUpdated'));

      setQuestion('');
      setDescription('');
      setCategory(categories[0]?.id || 'política');
      setOptions([
        { id: '1', text: 'SIM' },
        { id: '2', text: 'NÃO' },
      ]);
      setClosingTime('');
      setTags([]);
      setMinBetAmount('5');
      setMaxBetAmount('1000');
      setHasAttemptedSubmit(false);
      setIsMobileSidebarOpen(false);

      setTimeout(() => {
        navigate({ pathname: '/admin', search: '?tab=manage', hash: '#manage' });
      }, 700);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar mercado.', { id: 'create-market' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewMarket = useMemo<Market>(() => {
    const endDate = closingTime ? new Date(closingTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
      id: 'preview-market',
      title: question || 'Sua pergunta aparecerá aqui...',
      description: description || 'Defina critérios de resolução, fonte e detalhes para dar clareza ao mercado.',
      category: selectedCategory?.label || 'Categoria',
      endDate: endDate.toISOString(),
      totalVolume: 0,
      totalBettors: 0,
      simOdds: 2.0,
      naoOdds: 2.0,
      simProbability: 50,
      naoProbability: 50,
      status: 'active',
      tags,
    };
  }, [closingTime, description, question, selectedCategory, tags]);

  return (
    <div className="admin-create-market space-y-6">
      <div className="admin-form-glass admin-form-header">
        <div className="admin-form-header-main">
          <div className="form-header-icon" aria-hidden="true">
            <span></span>
          </div>
          <div>
            <h1>Criar Novo Mercado</h1>
            <p>Painel administrativo · preview em tempo real</p>
          </div>
        </div>

        <div className="admin-badge-verified">
          <span className="dot-green" />
          Admin verificado · {adminEmail}
        </div>
      </div>

      <div className="admin-form-layout">
        <div className="admin-form-main space-y-5">
          <section className="admin-form-glass admin-form-section">
            <h2 className="section-title">Informações Básicas</h2>

            <div className="space-y-4">
              <div>
                <label className="admin-form-label">Pergunta Principal *</label>
                <input
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={questionPlaceholder}
                  className={`admin-form-input ${showFieldError('question') ? 'field-error' : ''}`}
                  maxLength={200}
                />
                <div className="field-meta-row">
                  <span className="field-error-text">{showFieldError('question')}</span>
                  <span className={questionCounterClass}>{question.length}/200</span>
                </div>

                {polymarketSuggestions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Mercados similares no Polymarket
                    </p>
                    {polymarketSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[var(--text-secondary)]"
                      >
                        <p className="font-medium text-[var(--text-primary)]">{suggestion.question}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
                          <span>Vol: ${(suggestion.volumeTotal / 1000).toFixed(0)}k</span>
                          <span>SIM {(suggestion.yesProbability * 100).toFixed(0)}%</span>
                          <span>NÃO {(suggestion.noProbability * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="admin-form-label">Descrição & Critérios *</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Defina os critérios de resolução, a fonte de dados e as regras para liquidação do mercado."
                  rows={6}
                  className={`admin-form-textarea ${showFieldError('description') ? 'field-error' : ''}`}
                  maxLength={1200}
                />
                <div className="field-meta-row">
                  <span className="field-error-text">{showFieldError('description')}</span>
                  <span className={descriptionCounterClass}>{description.length}/1200</span>
                </div>
              </div>

              <div>
                <label className="admin-form-label">Categoria *</label>
                <div className="category-chip-grid">
                  {categories.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-chip ${active ? 'active' : ''}`}
                        style={{ ['--chip-color' as string]: cat.color } as React.CSSProperties}
                        onClick={() => setCategory(cat.id)}
                      >
                        <span className="chip-icon">{cat.icon}</span>
                        <span className="chip-label">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="field-error-text mt-2">{showFieldError('category')}</p>
              </div>
            </div>
          </section>

          <section className="admin-form-glass admin-form-section">
            <div className="section-head-inline">
              <h2 className="section-title">Opções de Resposta</h2>
              <button type="button" onClick={handleAddOption} className="option-add-btn">
                <Plus className="h-4 w-4" />
                Adicionar opção
              </button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={option.id} className="option-item-card">
                  <div className="option-item-head">
                    <span>Opção {index + 1}</span>
                    {options.length > 2 && (
                      <button type="button" onClick={() => handleRemoveOption(option.id)}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={option.text}
                    onChange={(event) => handleOptionChange(option.id, event.target.value)}
                    placeholder={`Ex: Alternativa ${index + 1}`}
                    className="admin-form-input"
                  />
                </div>
              ))}
            </div>

            <p className="field-error-text mt-2">{showFieldError('options')}</p>
          </section>
        </div>

        <aside className="admin-form-sidebar lg:sticky lg:top-6">
          <button
            type="button"
            className="mobile-preview-toggle lg:hidden"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          >
            <span>Preview + Cronograma</span>
            <span>{isMobileSidebarOpen ? '−' : '+'}</span>
          </button>

          <div className={`${isMobileSidebarOpen ? 'block' : 'hidden'} lg:block space-y-5`}>
            <section className="admin-form-glass admin-form-section">
              <div className="preview-header">
                <span>Preview ao vivo</span>
                <span className="live-dot">● LIVE</span>
              </div>

              <div
                className={`preview-card ${question.trim() || description.trim() ? 'has-content' : ''}`}
                style={{ borderColor: `${previewColor}66` }}
              >
                <div className="preview-card-badge" style={{ color: previewColor, borderColor: `${previewColor}70` }}>
                  {selectedCategory?.icon || ''} {selectedCategory?.label || 'Categoria'}
                </div>

                <h3 className="preview-card-title">{previewMarket.title}</h3>
                <p className="preview-card-description">{previewMarket.description}</p>

                <div className="preview-probability">
                  <div className="prob-bar">
                    <div className="prob-fill yes" style={{ width: '50%' }} />
                  </div>
                  <div className="prob-labels">
                    <span className="yes">SIM 50%</span>
                    <span className="no">NÃO 50%</span>
                  </div>
                </div>

                <div className="preview-card-footer">
                  <span>$0 volume</span>
                  <span>{daysUntilClose !== null ? `${daysUntilClose}d restantes` : 'Defina a data'}</span>
                </div>
              </div>

              <div className="form-completeness">
                <div className="completeness-track">
                  <div className="completeness-fill" style={{ width: `${completeness}%` }} />
                </div>
                <span>{completeness}% completo</span>
              </div>
            </section>

            <section className="admin-form-glass admin-form-section">
              <h3 className="section-title flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cronograma
              </h3>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="admin-form-label">Data de Encerramento *</label>
                  <input
                    type="datetime-local"
                    value={closingTime}
                    onChange={(event) => setClosingTime(event.target.value)}
                    min={getMinDateTime()}
                    className={`admin-form-input ${showFieldError('closingTime') ? 'field-error' : ''}`}
                  />
                  <p className="field-error-text mt-2">{showFieldError('closingTime')}</p>
                  {closingTime && daysUntilClose !== null && (
                    <div className="countdown-preview"> {daysUntilClose} dias restantes</div>
                  )}
                </div>

                <div className="bet-range-grid">
                  <div>
                    <label className="admin-form-label">Mín. aposta</label>
                    <div className="input-with-prefix">
                      <span>$</span>
                      <input
                        type="number"
                        value={minBetAmount}
                        onChange={(event) => setMinBetAmount(event.target.value)}
                        min={1}
                        placeholder="5"
                        className={`admin-form-input ${showFieldError('minBet') ? 'field-error' : ''}`}
                      />
                    </div>
                    <p className="field-error-text mt-2">{showFieldError('minBet')}</p>
                  </div>

                  <div className="bet-separator">—</div>

                  <div>
                    <label className="admin-form-label">Máx. aposta</label>
                    <div className="input-with-prefix">
                      <span>$</span>
                      <input
                        type="number"
                        value={maxBetAmount}
                        onChange={(event) => setMaxBetAmount(event.target.value)}
                        min={1}
                        placeholder="1000"
                        className={`admin-form-input ${showFieldError('maxBet') ? 'field-error' : ''}`}
                      />
                    </div>
                    <p className="field-error-text mt-2">{showFieldError('maxBet')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-form-glass admin-form-section">
              <h3 className="section-title">Tags</h3>

              <div className="tags-container mt-4">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}>
                      ×
                    </button>
                  </span>
                ))}

                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddTag(event.currentTarget.value);
                    }
                  }}
                  className="tag-input-inline"
                  placeholder="+ adicionar tag"
                />

                <button type="button" className="tag-add-btn" onClick={() => handleAddTag()}>
                  +
                </button>
              </div>
            </section>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isPending || !isFormReady}
              className="submit-btn-premium"
            >
              {isSubmitting || isPending ? (
                <>
                  <span className="spinner" />
                  Criando mercado...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Publicar Mercado
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>

            {!isFormReady && <p className="submit-help">Complete os campos obrigatórios para publicar.</p>}

            <button
              type="button"
              onClick={() => navigate({ pathname: '/admin', search: '?tab=manage', hash: '#manage' })}
              className="manage-link-btn"
            >
              Ir para Gerenciar Mercados
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
