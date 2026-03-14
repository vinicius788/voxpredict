import React, { useCallback, useEffect, useState } from 'react';
import { Plus, PlayCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api-client';

type TemplateFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

type TemplateRow = {
  id: number;
  name: string;
  titleTemplate: string;
  descTemplate: string;
  category: string;
  frequency: TemplateFrequency;
  variables: Record<string, string>;
  minBet: number;
  maxBet: number;
  active: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
};

const INITIAL_FORM = {
  name: '',
  titleTemplate: '',
  descTemplate: '',
  category: 'cripto',
  frequency: 'MONTHLY' as TemplateFrequency,
  variables: '{"btc_target":"auto_btc_110pct","month_year":"auto_next_month"}',
  minBet: 5,
  maxBet: 1000,
};

export const AdminTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getTemplates();
      setTemplates((response?.data || response || []) as TemplateRow[]);
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const createTemplate = async () => {
    try {
      setIsCreating(true);
      const parsedVariables = JSON.parse(form.variables) as Record<string, string>;
      await api.createTemplate({
        name: form.name,
        titleTemplate: form.titleTemplate,
        descTemplate: form.descTemplate,
        category: form.category,
        frequency: form.frequency,
        variables: parsedVariables,
        minBet: Number(form.minBet),
        maxBet: Number(form.maxBet),
        active: true,
      });
      toast.success('Template criado.');
      setForm(INITIAL_FORM);
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao criar template');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTemplate = async (template: TemplateRow) => {
    try {
      await api.updateTemplate(template.id, { active: !template.active });
      toast.success(template.active ? 'Template desativado.' : 'Template ativado.');
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao atualizar template');
    }
  };

  const runNow = async (template: TemplateRow) => {
    try {
      await api.runTemplate(template.id);
      toast.success(`Mercado criado com template "${template.name}".`);
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao executar template');
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="vp-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Templates Periódicos</h2>
            <p className="text-sm text-[var(--text-secondary)]">Crie mercados recorrentes sem trabalho manual.</p>
          </div>
          <button
            onClick={() => void loadTemplates()}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="vp-input h-10 px-3 text-sm"
            placeholder="Nome (ex: BTC Mensal)"
          />
          <select
            value={form.frequency}
            onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value as TemplateFrequency }))}
            className="vp-input h-10 px-3 text-sm"
          >
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
            <option value="QUARTERLY">QUARTERLY</option>
          </select>
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="vp-input h-10 px-3 text-sm"
            placeholder="Categoria"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={form.minBet}
              onChange={(event) => setForm((prev) => ({ ...prev, minBet: Number(event.target.value) }))}
              className="vp-input h-10 px-3 text-sm"
              placeholder="Min bet"
            />
            <input
              type="number"
              value={form.maxBet}
              onChange={(event) => setForm((prev) => ({ ...prev, maxBet: Number(event.target.value) }))}
              className="vp-input h-10 px-3 text-sm"
              placeholder="Max bet"
            />
          </div>
          <input
            value={form.titleTemplate}
            onChange={(event) => setForm((prev) => ({ ...prev, titleTemplate: event.target.value }))}
            className="vp-input h-10 px-3 text-sm xl:col-span-2"
            placeholder="Título template (ex: O BTC fecha acima de ${{btc_target}} em {{month_year}}?)"
          />
          <textarea
            value={form.descTemplate}
            onChange={(event) => setForm((prev) => ({ ...prev, descTemplate: event.target.value }))}
            className="vp-input px-3 py-2 text-sm xl:col-span-2"
            rows={2}
            placeholder="Descrição template"
          />
          <textarea
            value={form.variables}
            onChange={(event) => setForm((prev) => ({ ...prev, variables: event.target.value }))}
            className="vp-input px-3 py-2 font-mono text-xs xl:col-span-2"
            rows={2}
            placeholder='{"btc_target":"auto_btc_110pct","month_year":"auto_next_month"}'
          />
        </div>

        <button
          onClick={() => void createTemplate()}
          disabled={isCreating}
          className="mt-4 inline-flex items-center gap-2 rounded-[8px] border border-[rgba(124,58,237,0.45)] bg-[rgba(124,58,237,0.25)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? 'Criando...' : 'Criar Template'}
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <article key={template.id} className="vp-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{template.name}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {template.frequency} · {template.category}
                </p>
              </div>
              <span
                className={`rounded-[999px] border px-2 py-0.5 text-xs font-semibold ${
                  template.active
                    ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.16)] text-[#6ee7b7]'
                    : 'border-[rgba(148,163,184,0.45)] bg-[rgba(148,163,184,0.16)] text-[#cbd5e1]'
                }`}
              >
                {template.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">{template.titleTemplate}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
              <span>Próxima criação: {template.nextRunAt ? new Date(template.nextRunAt).toLocaleString('pt-BR') : 'não definida'}</span>
              <span>Última: {template.lastRunAt ? new Date(template.lastRunAt).toLocaleString('pt-BR') : 'nunca'}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void runNow(template)}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.18)] px-3 py-2 text-xs font-semibold text-[#bfdbfe]"
              >
                <PlayCircle className="h-4 w-4" />
                Criar agora
              </button>
              <button
                onClick={() => void toggleTemplate(template)}
                className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
              >
                {template.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </article>
        ))}

        {!templates.length && !loading && (
          <div className="vp-card p-4 text-sm text-[var(--text-secondary)]">Nenhum template cadastrado.</div>
        )}
      </div>
    </div>
  );
};
