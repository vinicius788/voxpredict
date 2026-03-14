import React, { useEffect, useState } from 'react';
import { ArrowUpFromLine, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAmount: number;
  onWithdraw: (amount: number) => Promise<unknown>;
  isProcessing: boolean;
  stepMessage?: string;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  availableAmount,
  onWithdraw,
  isProcessing,
  stepMessage,
}) => {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      return;
    }

    setAmount(availableAmount.toFixed(2));
  }, [availableAmount, isOpen]);

  if (!isOpen) return null;

  const submit = async () => {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor válido para saque.');
      return;
    }

    if (parsedAmount > availableAmount + 0.0001) {
      toast.error('Valor maior que o saldo disponível.');
      return;
    }

    await onWithdraw(parsedAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,27,0.98)] p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Sacar do Cofre</h3>
            <p className="text-sm text-[var(--text-secondary)]">Confirme o saque na carteira para enviar USDT de volta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-[8px] border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Fechar modal de saque"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[var(--text-secondary)]">
            Disponível para saque: <strong className="mono-value text-[var(--text-primary)]">${availableAmount.toFixed(2)} USDT</strong>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Valor</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="vp-input h-11 w-full px-3 text-sm"
              placeholder="0.00"
              disabled={isProcessing}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAmount((availableAmount * 0.25).toFixed(2))}
                disabled={isProcessing}
                className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setAmount((availableAmount * 0.5).toFixed(2))}
                disabled={isProcessing}
                className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setAmount(availableAmount.toFixed(2))}
                disabled={isProcessing}
                className="rounded-[8px] border border-[rgba(245,158,11,0.4)] px-2.5 py-1 text-xs font-semibold text-[#fbbf24]"
              >
                100%
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Status: {stepMessage || 'Aguardando confirmação'}</p>
            <p className="mt-1 text-xs text-[#fbbf24]">No contrato atual, o saque acontece sobre o saldo total disponível.</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-[10px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isProcessing || availableAmount <= 0}
            className="vp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <ArrowUpFromLine className="h-4 w-4" />
            {isProcessing ? stepMessage || 'Processando...' : 'Sacar'}
          </button>
        </div>
      </div>
    </div>
  );
};
