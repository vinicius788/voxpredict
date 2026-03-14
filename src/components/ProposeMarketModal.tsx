import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';

type CategoryOption = {
  key: string;
  label: string;
};

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { key: 'politica', label: 'Política' },
  { key: 'economia', label: 'Economia' },
  { key: 'cripto', label: 'Cripto' },
  { key: 'esportes', label: 'Esportes' },
  { key: 'geopolitica', label: 'Geopolítica' },
];

const getDefaultResolveBy = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

export const ProposeMarketModal: React.FC = () => {
  const location = useLocation();
  const { isSignedIn, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('politica');
  const [resolveBy, setResolveBy] = useState(getDefaultResolveBy());
  const [tagsInput, setTagsInput] = useState('');

  const hideWidget = useMemo(() => location.pathname.startsWith('/admin') || !isSignedIn || !user, [isSignedIn, location.pathname, user]);

  useEffect(() => {
    if (hideWidget) return;
    const loadCategories = async () => {
      try {
        const response = await api.getCategories();
        const rows = (response?.data || response || []) as Array<{
          key?: string;
          label?: string;
          active?: boolean;
        }>;

        const parsed = rows
          .filter((item) => item.active !== false && item.label)
          .map((item) => ({
            key: item.key || String(item.label).toLowerCase(),
            label: String(item.label),
          }));

        if (parsed.length) {
          setCategories(parsed);
          setCategory((prev) => (parsed.some((item) => item.key === prev) ? prev : parsed[0].key));
        }
      } catch {
        setCategories(FALLBACK_CATEGORIES);
      }
    };

    void loadCategories();
  }, [hideWidget]);

  if (hideWidget) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(categories[0]?.key || 'politica');
    setResolveBy(getDefaultResolveBy());
    setTagsInput('');
  };

  const submitProposal = async () => {
    if (!title.trim() || title.trim().length < 10) {
      toast.error('Título muito curto (mínimo 10 caracteres).');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      toast.error('Descrição muito curta (mínimo 20 caracteres).');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);

      await api.createProposal({
        title: title.trim(),
        description: description.trim(),
        category,
        resolveBy,
        tags,
      });

      toast.success('Sua proposta foi enviada para revisão!');
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao enviar proposta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-[999px] border border-[rgba(168,85,247,0.45)] bg-[linear-gradient(135deg,#7C3AED,#A855F7)] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(168,85,247,0.35)] transition-transform hover:-translate-y-[1px] md:bottom-6 md:right-6"
      >
        <Lightbulb className="h-4 w-4" />
        Propor Mercado
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,27,0.98)] p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">💡 Propor Mercado</h3>
                <p className="text-sm text-[var(--text-secondary)]">Sua ideia será revisada pelo admin.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[8px] border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Fechar modal de proposta"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Título</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: O Bitcoin fecha acima de US$ 120 mil em dezembro?"
                  className="vp-input h-11 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Descrição</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descreva critérios objetivos de resolução e contexto."
                  rows={4}
                  className="vp-input px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Categoria</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="vp-input h-11 px-3 text-sm">
                    {categories.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Data sugerida</label>
                  <input type="date" value={resolveBy} onChange={(event) => setResolveBy(event.target.value)} className="vp-input h-11 px-3 text-sm" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Tags (opcional)</label>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="btc, copom, política"
                  className="vp-input h-11 px-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[10px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitProposal}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#7C3AED,#A855F7)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
