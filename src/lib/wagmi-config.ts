import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { coinbaseWallet } from 'wagmi/connectors';
import { polygon, polygonAmoy } from 'wagmi/chains';

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 80002);
const activeChain = chainId === 137 ? polygon : polygonAmoy;

const polygonRpc = import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com';
const amoyRpc =
  import.meta.env.VITE_MUMBAI_RPC_URL ||
  import.meta.env.VITE_POLYGON_RPC_URL ||
  'https://rpc-amoy.polygon.technology';
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';
const appName = import.meta.env.VITE_APP_NAME || 'VoxPredict';

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected({ target: 'metaMask' }),
    coinbaseWallet({
      appName,
    }),
    walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: appName,
        description: 'Mercados preditivos descentralizados',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://voxpredict.com',
        icons: [],
      },
    }),
  ],
  transports: {
    [polygon.id]: http(polygonRpc),
    [polygonAmoy.id]: http(amoyRpc),
  },
});
