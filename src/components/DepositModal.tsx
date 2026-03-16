import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useTokenBalance } from '../hooks/useTokenBalance';
import type { VaultToken } from '../hooks/useVaultContract';
import { TransakWidget } from './TransakWidget';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, token: VaultToken) => Promise<unknown>;
  isProcessing: boolean;
  stepMessage?: string;
}

const TOKENS: VaultToken[] = ['USDT', 'USDC', 'DAI'];
const QUICK_AMOUNTS = [10, 25, 50, 100];
const QUICK_BRL_AMOUNTS = [50, 100, 250, 500];
const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);

const getConnectorLabel = (id: string, name: string) => {
  const normalizedId = id.toLowerCase();
  const normalizedName = name.toLowerCase();

  if (normalizedId.includes('metamask') || normalizedName.includes('metamask')) return 'MetaMask';
  if (normalizedId.includes('walletconnect') || normalizedName.includes('walletconnect')) return 'WalletConnect';
  if (normalizedId.includes('coinbase') || normalizedName.includes('coinbase')) return 'Coinbase Wallet';
  return name;
};

const getNetworkName = (chainId: number) => {
  if (chainId === 137) return 'Polygon';
  if (chainId === 80002) return 'Polygon Amoy';
  return `Chain ${chainId}`;
};

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onDeposit,
  isProcessing,
  stepMessage,
}) => {
  const [method, setMethod] = useState<'crypto' | 'pix_card'>('pix_card');
  const [token, setToken] = useState<VaultToken>('USDT');
  const [amount, setAmount] = useState('');
  const [brlAmount, setBrlAmount] = useState(50);

  const { isConnected, chain } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting, variables } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const usdtBalance = useTokenBalance('USDT');
  const usdcBalance = useTokenBalance('USDC');
  const daiBalance = useTokenBalance('DAI');

  const isWrongNetwork = Boolean(isConnected && chain?.id !== expectedChainId);

  const walletConnectors = useMemo(() => {
    return [...connectors].filter((connector) => (connector as any).ready !== false);
  }, [connectors]);

  const selectedTokenState = useMemo(() => {
    if (token === 'USDT') return usdtBalance;
    if (token === 'USDC') return usdcBalance;
    return daiBalance;
  }, [token, usdtBalance, usdcBalance, daiBalance]);

  const selectedBalance = selectedTokenState.balanceNumber;

  useEffect(() => {
    if (!isOpen) {
      setMethod('pix_card');
      setToken('USDT');
      setAmount('');
      setBrlAmount(50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInlineConnect = async (connector: (typeof connectors)[number]) => {
    await connectAsync({ connector });
    if (token === 'USDT') await usdtBalance.refetch();
    if (token === 'USDC') await usdcBalance.refetch();
    if (token === 'DAI') await daiBalance.refetch();
  };

  const submit = async () => {
    if (!isConnected) {
      toast.error('Conecte sua carteira primeiro.');
      return;
    }

    if (isWrongNetwork) {
      toast.error(`Troque para ${getNetworkName(expectedChainId)}.`);
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor válido para depósito.');
      return;
    }

    if (selectedTokenState.isFetching) {
      toast.error('Aguardando atualização do saldo da carteira...');
      return;
    }

    if (parsedAmount > selectedBalance + 0.0001) {
      toast.error('Saldo insuficiente na carteira para este token.');
      return;
    }

    await onDeposit(parsedAmount, token);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,17,27,0.98)] p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Depositar no Cofre</h3>
            <p className="text-sm text-[var(--text-secondary)]">Aprove token e confirme a transação on-chain.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-[8px] border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
            aria-label="Fechar modal de depósito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMethod('pix_card')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              method === 'pix_card'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            💳 PIX / Cartão
          </button>
          <button
            type="button"
            onClick={() => setMethod('crypto')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              method === 'crypto'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            🔗 Cripto (USDT)
          </button>
        </div>

        {!isConnected && (
          <div className="mb-3 rounded-[10px] border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] p-3">
            <p className="text-xs font-semibold text-[#fcd34d]">Conecte sua carteira primeiro</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {walletConnectors.map((connector) => {
                const connectorLabel = getConnectorLabel(connector.id, connector.name);
                const connectorPending = isConnecting && (variables as any)?.connector?.id === connector.id;

                return (
                  <button
                    key={connector.uid}
                    type="button"
                    onClick={() => void handleInlineConnect(connector)}
                    disabled={isConnecting}
                    className="rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] disabled:opacity-60"
                  >
                    {connectorPending ? `Conectando ${connectorLabel}...` : `Conectar com ${connectorLabel}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isConnected && isWrongNetwork && (
          <div className="mb-3 rounded-[10px] border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] p-3">
            <div className="flex items-center gap-2 text-[#fcd34d]">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-semibold">Troque para {getNetworkName(expectedChainId)}</p>
            </div>
            <button
              type="button"
              onClick={() => switchChain({ chainId: expectedChainId })}
              disabled={isSwitching}
              className="mt-2 rounded-[8px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.18)] px-3 py-2 text-xs font-semibold text-[#fcd34d] disabled:opacity-60"
            >
              {isSwitching ? 'Trocando rede...' : `Trocar para ${getNetworkName(expectedChainId)}`}
            </button>
          </div>
        )}

        {method === 'pix_card' ? (
          <div className="space-y-4">
            <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-green-400">✓</span> PIX instantâneo
              </p>
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                <span className="text-green-400">✓</span> Cartão de crédito/débito
              </p>
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                <span className="text-green-400">✓</span> Mínimo R$50
              </p>
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                <span className="text-green-400">✓</span> USDC/USDT direto na sua carteira Polygon
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Valor (BRL)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_BRL_AMOUNTS.map((quickBrlAmount) => (
                  <button
                    key={quickBrlAmount}
                    type="button"
                    onClick={() => setBrlAmount(quickBrlAmount)}
                    className={`rounded-lg py-2 text-sm transition-all ${
                      brlAmount === quickBrlAmount
                        ? 'bg-amber-500 font-medium text-black'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    R${quickBrlAmount}
                  </button>
                ))}
              </div>
            </div>

            <TransakWidget
              defaultAmount={brlAmount}
              disabled={!isConnected || isProcessing}
              onSuccess={() => {
                toast.success('Depósito iniciado! Você receberá os fundos em instantes.');
                onClose();
              }}
              onClose={onClose}
            />

            <p className="text-center text-xs text-gray-600">
              Powered by Transak • Taxa estimada: ~1.5% + câmbio
            </p>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-[10px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-60"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Token</label>
                <select
                  value={token}
                  onChange={(event) => setToken(event.target.value as VaultToken)}
                  className="vp-input h-11 w-full px-3 text-sm"
                  disabled={isProcessing || !isConnected || isWrongNetwork}
                >
                  {TOKENS.map((tokenOption) => (
                    <option key={tokenOption} value={tokenOption}>
                      {tokenOption}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Carteira: {isConnected ? `$${selectedBalance.toFixed(2)} ${token}` : '--'}
                </p>
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
                  disabled={isProcessing || !isConnected || isWrongNetwork}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => setAmount(String(quickAmount))}
                      disabled={isProcessing || !isConnected || isWrongNetwork}
                      className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-60"
                    >
                      ${quickAmount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(selectedBalance.toFixed(2))}
                    disabled={isProcessing || !isConnected || isWrongNetwork}
                    className="rounded-[8px] border border-[rgba(245,158,11,0.4)] px-2.5 py-1 text-xs font-semibold text-[#fbbf24] transition-colors disabled:opacity-60"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-xs text-[var(--text-secondary)]">
                <p>Taxa de gas: estimada na confirmação da carteira.</p>
                <p className="mt-1 text-[var(--text-muted)]">Status: {stepMessage || 'Aguardando confirmação'}</p>
                {token !== 'USDT' && (
                  <p className="mt-1 text-[#fbbf24]">No contrato atual, o cofre aceita somente USDT.</p>
                )}
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
                disabled={isProcessing}
                className="vp-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                <ArrowDownToLine className="h-4 w-4" />
                {isProcessing ? stepMessage || 'Processando...' : 'Depositar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
