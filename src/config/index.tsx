import { wagmiConfig } from '../lib/wagmi-config';

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';
export const networks = wagmiConfig.chains;

// Kept for compatibility with legacy imports in the codebase.
export const wagmiAdapter = {
  wagmiConfig,
};

export const getWagmiConfig = () => wagmiConfig;
