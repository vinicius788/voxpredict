import React, { createContext, useContext, useMemo } from 'react';
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { toast } from 'react-hot-toast';

export interface Web3ContextType {
  isWalletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  isConnecting: boolean;
  walletType: 'embedded' | 'external' | null;
  chainId: number | undefined;
  switchChain: (chainId: number) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const connectWallet = async () => {
    try {
      const injectedConnector = connectors.find((connector) => connector.type === 'injected');
      const fallbackConnector = connectors[0];
      const connector = injectedConnector || fallbackConnector;

      if (!connector) {
        toast.error('Nenhuma carteira disponível para conexão.');
        return;
      }

      await connectAsync({ connector });
      toast.success('Carteira conectada com sucesso!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Falha ao conectar carteira.');
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnectAsync();
      toast.success('Carteira desconectada.');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Falha ao desconectar carteira.');
    }
  };

  const switchChain = async (nextChainId: number) => {
    try {
      if (!switchChainAsync) {
        toast.error('Sua carteira não suporta troca automática de rede.');
        return;
      }
      await switchChainAsync({ chainId: nextChainId });
      toast.success(`Rede alterada para ${nextChainId}.`);
    } catch (error) {
      console.error('Error switching chain:', error);
      toast.error('Falha ao trocar de rede.');
    }
  };

  const value = useMemo<Web3ContextType>(
    () => ({
      isWalletConnected: isConnected,
      walletAddress: address || null,
      connectWallet,
      disconnectWallet,
      isConnecting: isPending,
      walletType: isConnected ? 'external' : null,
      chainId,
      switchChain,
    }),
    [address, chainId, isConnected, isPending],
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
