// Simplified web3 configuration file
// This file is intentionally kept minimal to avoid loading issues

// Default chain configuration
const chains = {
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com'
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org'
  },
  mainnet: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorer: 'https://etherscan.io'
  }
};

// Simplified configuration
const wagmiConfig = {
  chains: [chains.polygon, chains.base, chains.mainnet]
};

// Simplified adapter
const reownAdapter = {
  apiKey: '8c7880b7-8252-4fbb-88a2-2e432a3b9803',
  chains: [chains.polygon, chains.base, chains.mainnet]
};

export { wagmiConfig, reownAdapter, chains };