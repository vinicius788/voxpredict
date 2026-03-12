import React from 'react';
import { AlertTriangle, LogOut, Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);

const getNetworkName = (chainId: number) => {
  if (chainId === 137) return 'Polygon';
  if (chainId === 80002) return 'Polygon Amoy (Testnet)';
  return `Chain ${chainId}`;
};

export const ConnectWalletButton: React.FC = () => {
  const { address, chain, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = Boolean(isConnected && chain?.id !== expectedChainId);
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const metamaskConnector =
    connectors.find((connector) => connector.id.toLowerCase().includes('metamask')) ||
    connectors.find((connector) => connector.name.toLowerCase().includes('metamask')) ||
    connectors.find((connector) => connector.id.toLowerCase().includes('injected'));

  const walletConnectConnector =
    connectors.find((connector) => connector.id.toLowerCase().includes('walletconnect')) ||
    connectors.find((connector) => connector.name.toLowerCase().includes('walletconnect'));

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: expectedChainId })}
        disabled={isSwitching}
        className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.18)] px-3 py-2 text-xs font-semibold text-[#fcd34d] transition-colors hover:bg-[rgba(245,158,11,0.28)] disabled:opacity-60"
      >
        <AlertTriangle className="h-4 w-4" />
        {isSwitching ? 'Trocando rede...' : `Trocar para ${getNetworkName(expectedChainId)}`}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="inline-flex items-center gap-2 rounded-[999px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#10b981] to-[#3b82f6] text-white">
          <Wallet className="h-3.5 w-3.5" />
        </span>
        {shortAddress}
        <LogOut className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => metamaskConnector && connect({ connector: metamaskConnector })}
        disabled={isPending || !metamaskConnector}
        className="rounded-[8px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-50"
      >
        🦊 MetaMask
      </button>
      <button
        onClick={() => walletConnectConnector && connect({ connector: walletConnectConnector })}
        disabled={isPending || !walletConnectConnector}
        className="vp-btn-primary px-3 py-2 text-xs font-semibold disabled:opacity-50"
      >
        🔗 WalletConnect
      </button>
    </div>
  );
};
