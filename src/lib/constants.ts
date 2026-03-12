export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 80002);

export const TOKEN_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
  137: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  80002: {
    USDT: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832',
    USDC: '0xe11A86849d99F524cAC3E7A0Ec1241828e332C62',
    DAI: '0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6f',
  },
};

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}`;

export const TOKEN_DECIMALS: Record<string, number> = {
  USDT: 6,
  USDC: 6,
  DAI: 18,
};

export const SUPPORTED_TOKENS = ['USDT', 'USDC', 'DAI'] as const;
export type SupportedToken = (typeof SUPPORTED_TOKENS)[number];
