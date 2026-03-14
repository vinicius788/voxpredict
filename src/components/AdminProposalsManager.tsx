import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Edit3, MessageSquareWarning, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api-client';

type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type ProposalRow = {
  id: number;
  title: string;
  description: string;
  category: string;
  resolveBy: string;
  tags: string[];
  status: ProposalStatus;
  user?: { id: string; email: string; username?: string | null };
  adminNote?: string | null;
  createdAt: string;
};

type Props = {
  onPendingCountChange?: (count: number) => void;
};

const STATUS_OPTIONS: ProposalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export const AdminProposalsManager: React.FC<Props> = ({ onPendingCountChange }) => {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus>('PENDING');
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [editing, setEditing] = useState<ProposalRow | null>(null);
  const [rejecting, setRejecting] = useState<ProposalRow | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [approveDraft, setApproveDraft] = useState({
    title: '',
    description: '',
    category: '',
    resolveBy: '',
    tags: '',
  });

  const loadProposals = useCallback(async (status: ProposalStatus) => {
    setLoading(true);
    try {
      const response = await api.getProposals(status);
      const items = (response?.data || response || []) as ProposalRow[];
      setProposals(items);

      if (onPendingCountChange) {
        if (status === 'PENDING') {
          onPendingCountChange(items.length);
        } else {
          const pendingResponse = await api.getProposals('PENDING');
          const pendingItems = (pendingResponse?.data || pendingResponse || []) as ProposalRow[];
          onPendingCountChange(pendingItems.length);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao carregar propostas');
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    void loadProposals(statusFilter);
  }, [loadProposals, statusFilter]);

  const counts = useMemo(() => ({
    total: proposals.length,
  }), [proposals.length]);

  const openEditApproval = (proposal: ProposalRow) => {
    setEditing(proposal);
    setApproveDraft({
      title: proposal.title,
      description: proposal.description,
      category: proposal.category,
      resolveBy: proposal.resolveBy.slice(0, 10),
      tags: proposal.tags.join(', '),
    });
  };

  const approveDirect = async (proposalId: number) => {
    try {
      await api.approveProposal(proposalId, {});
      toast.success('Proposta aprovada e mercado criado.');
      await loadProposals(statusFilter);
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao aprovar proposta');
    }
  };

  const approveWithEdits = async () => {
    if (!editing) return;
    try {
      const tags = approveDraft.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      await api.approveProposal(editing.id, {
        title: approveDraft.title,
        description: approveDraft.description,
        category: approveDraft.category,
        resolveBy: approveDraft.resolveBy,
        tags,
      });

      toast.success('Proposta editada, aprovada e mercado criado.');
      setEditing(null);
      await loadProposals(statusFilter);
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao aprovar proposta');
    }
  };

  const rejectProposal = async () => {
    if (!rejecting) return;
    if (adminNote.trim().length < 3) {
      toast.error('Escreva uma nota de rejeição (mínimo 3 caracteres).');
      return;
    }
    try {
      await api.rejectProposal(rejecting.id, adminNote.trim());
      toast.success('Proposta rejeitada.');
      setRejecting(null);
      setAdminNote('');
      await loadProposals(statusFilter);
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao rejeitar proposta');
    }
  };

  const statusClass = (status: ProposalStatus) => {
    if (status === 'APPROVED') return 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.16)] text-[#6ee7b7]';
    if (status === 'REJECTED') return 'border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.16)] text-[#fca5a5]';
    return 'border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.16)] text-[#fcd34d]';
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="vp-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Propostas de Usuários</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Curadoria admin com aprovação de 1 clique ou edição antes de publicar.
            </p>
          </div>

          <button
            onClick={() => void loadProposals(statusFilter)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-[rgba(124,58,237,0.25)] text-[var(--text-primary)]'
                  : 'border border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >
              {status === 'PENDING' ? 'Pendentes' : status === 'APPROVED' ? 'Aprovadas' : 'Rejeitadas'}
            </button>
          ))}
          <span className="inline-flex items-center rounded-[8px] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
            {counts.total} resultado{counts.total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="vp-card p-5 text-sm text-[var(--text-secondary)]">Carregando propostas...</div>
      ) : proposals.length === 0 ? (
        <div className="vp-card p-5 text-sm text-[var(--text-secondary)]">Nenhuma proposta encontrada neste filtro.</div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <article key={proposal.id} className="vp-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{proposal.title}</h3>
                <span className={`rounded-[999px] border px-2 py-0.5 text-[11px] font-semibold ${statusClass(proposal.status)}`}>
                  {proposal.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">{proposal.description}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span>Usuário: {proposal.user?.email || proposal.user?.username || 'desconhecido'}</span>
                <span>Categoria: {proposal.category}</span>
                <span>Sugerida para: {new Date(proposal.resolveBy).toLocaleDateString('pt-BR')}</span>
                <span>Criada em: {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              {proposal.adminNote && (
                <div className="mt-3 rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-2 text-xs text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Nota admin:</strong> {proposal.adminNote}
                </div>
              )}

              {proposal.status === 'PENDING' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void approveDirect(proposal.id)}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-3 py-2 text-xs font-semibold text-[#6ee7b7]"
                  >
                    <Check className="h-4 w-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => openEditApproval(proposal)}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.18)] px-3 py-2 text-xs font-semibold text-[#bfdbfe]"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar e Aprovar
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(proposal);
                      setAdminNote('');
                    }}
                    className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.16)] px-3 py-2 text-xs font-semibold text-[#fca5a5]"
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] p-4">
          <div className="w-full max-w-2xl rounded-[14px] border border-[var(--border)] bg-[rgba(13,11,26,0.98)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Editar e Aprovar</h3>
            <p className="text-sm text-[var(--text-secondary)]">Ajuste os dados antes de publicar o mercado.</p>

            <div className="mt-4 space-y-3">
              <input
                value={approveDraft.title}
                onChange={(event) => setApproveDraft((prev) => ({ ...prev, title: event.target.value }))}
                className="vp-input h-10 px-3 text-sm"
                placeholder="Título"
              />
              <textarea
                value={approveDraft.description}
                onChange={(event) => setApproveDraft((prev) => ({ ...prev, description: event.target.value }))}
                className="vp-input px-3 py-2 text-sm"
                rows={4}
                placeholder="Descrição"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={approveDraft.category}
                  onChange={(event) => setApproveDraft((prev) => ({ ...prev, category: event.target.value }))}
                  className="vp-input h-10 px-3 text-sm"
                  placeholder="Categoria"
                />
                <input
                  type="date"
                  value={approveDraft.resolveBy}
                  onChange={(event) => setApproveDraft((prev) => ({ ...prev, resolveBy: event.target.value }))}
                  className="vp-input h-10 px-3 text-sm"
                />
              </div>
              <input
                value={approveDraft.tags}
                onChange={(event) => setApproveDraft((prev) => ({ ...prev, tags: event.target.value }))}
                className="vp-input h-10 px-3 text-sm"
                placeholder="tags separadas por vírgula"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                Cancelar
              </button>
              <button
                onClick={() => void approveWithEdits()}
                className="rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.2)] px-3 py-2 text-sm font-semibold text-[#6ee7b7]"
              >
                Salvar e Aprovar
              </button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] p-4">
          <div className="w-full max-w-lg rounded-[14px] border border-[var(--border)] bg-[rgba(13,11,26,0.98)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Rejeitar Proposta</h3>
            <p className="text-sm text-[var(--text-secondary)]">Escreva uma nota explicando o motivo da rejeição.</p>
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              className="vp-input mt-4 w-full px-3 py-2 text-sm"
              rows={4}
              placeholder="Ex: Critério de resolução ainda está subjetivo."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejecting(null);
                  setAdminNote('');
                }}
                className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => void rejectProposal()}
                className="rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.16)] px-3 py-2 text-sm font-semibold text-[#fca5a5]"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
