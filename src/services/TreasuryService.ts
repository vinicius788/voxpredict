import { createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, polygon } from 'viem/chains';

// Endereço oficial da Safe da VoxPredict
export const VOXPREDICT_SAFE_ADDRESS = '0x3f12fFbbfa1D10e66462Dc41D926F9C72eDd5f5b' as Address;

// Tokens importantes para monitorar
const MONITORED_TOKENS = {
  ETH: {
    symbol: 'ETH',
    decimals: 18,
    address: null, // ETH nativo
  },
  USDT: {
    symbol: 'USDT',
    decimals: 6,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
  },
  USDC: {
    symbol: 'USDC',
    decimals: 6,
    address: '0xA0b86a33E6441b8C4505B5c0c6b8b8b8b8b8b8b8' as Address,
  },
  DAI: {
    symbol: 'DAI',
    decimals: 18,
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address,
  }
};

// ERC20 ABI para consultar saldos
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const;

export interface TreasuryBalance {
  token: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  usdValue: number;
  lastUpdated: Date;
}

export interface SafeData {
  address: string;
  totalUsdValue: number;
  balances: TreasuryBalance[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export class TreasuryService {
  private static instance: TreasuryService;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutos
  
  // Clientes para diferentes redes
  private mainnetClient = createPublicClient({
    chain: mainnet,
    transport: http(`https://mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_KEY || 'demo'}`),
  });

  private polygonClient = createPublicClient({
    chain: polygon,
    transport: http(),
  });

  static getInstance(): TreasuryService {
    if (!TreasuryService.instance) {
      TreasuryService.instance = new TreasuryService();
    }
    return TreasuryService.instance;
  }

  /**
   * Obter saldo completo da Safe da tesouraria
   */
  async getSafeBalance(): Promise<SafeData> {
    const cacheKey = `safe_balance_${VOXPREDICT_SAFE_ADDRESS}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    try {
      const balances: TreasuryBalance[] = [];
      let totalUsdValue = 0;

      // 1. Saldo de ETH nativo
      const ethBalance = await this.getETHBalance();
      if (ethBalance) {
        balances.push(ethBalance);
        totalUsdValue += ethBalance.usdValue;
      }

      // 2. Saldos de tokens ERC20
      for (const [tokenKey, tokenInfo] of Object.entries(MONITORED_TOKENS)) {
        if (tokenInfo.address) {
          const tokenBalance = await this.getTokenBalance(tokenInfo.address, tokenInfo.symbol, tokenInfo.decimals);
          if (tokenBalance && parseFloat(tokenBalance.balance) > 0) {
            balances.push(tokenBalance);
            totalUsdValue += tokenBalance.usdValue;
          }
        }
      }

      const safeData: SafeData = {
        address: VOXPREDICT_SAFE_ADDRESS,
        totalUsdValue,
        balances,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      };

      // Salvar no cache
      this.cache.set(cacheKey, {
        data: safeData,
        timestamp: Date.now()
      });

      return safeData;

    } catch (error) {
      console.error('Erro ao buscar saldo da Safe:', error);
      return {
        address: VOXPREDICT_SAFE_ADDRESS,
        totalUsdValue: 0,
        balances: [],
        lastUpdated: new Date(),
        isLoading: false,
        error: 'Erro ao conectar com a blockchain',
      };
    }
  }

  /**
   * Obter saldo de ETH da Safe
   */
  private async getETHBalance(): Promise<TreasuryBalance | null> {
    try {
      const balance = await this.mainnetClient.getBalance({
        address: VOXPREDICT_SAFE_ADDRESS,
      });

      const balanceFormatted = formatEther(balance);
      const ethPrice = await this.getETHPrice();

      return {
        token: 'ETH',
        symbol: 'ETH',
        balance: balance.toString(),
        balanceFormatted: `${parseFloat(balanceFormatted).toFixed(4)} ETH`,
        usdValue: parseFloat(balanceFormatted) * ethPrice,
        lastUpdated: new Date(),
      };

    } catch (error) {
      console.error('Erro ao buscar saldo de ETH:', error);
      return null;
    }
  }

  /**
   * Obter saldo de token ERC20
   */
  private async getTokenBalance(
    tokenAddress: Address, 
    symbol: string, 
    decimals: number
  ): Promise<TreasuryBalance | null> {
    try {
      const balance = await this.mainnetClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [VOXPREDICT_SAFE_ADDRESS],
      }) as bigint;

      const balanceFormatted = (Number(balance) / Math.pow(10, decimals)).toFixed(decimals === 18 ? 4 : 2);
      const tokenPrice = await this.getTokenPrice(symbol);

      return {
        token: symbol,
        symbol,
        balance: balance.toString(),
        balanceFormatted: `${balanceFormatted} ${symbol}`,
        usdValue: parseFloat(balanceFormatted) * tokenPrice,
        lastUpdated: new Date(),
      };

    } catch (error) {
      console.error(`Erro ao buscar saldo de ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Obter preço do ETH em USD
   */
  private async getETHPrice(): Promise<number> {
    const cacheKey = 'eth_price';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.price;
      }
    }

    try {
      // Em produção, usar API real como CoinGecko
      const mockPrice = 2400; // $2,400 USD
      
      this.cache.set(cacheKey, {
        price: mockPrice,
        timestamp: Date.now()
      });

      return mockPrice;
    } catch (error) {
      console.error('Erro ao buscar preço do ETH:', error);
      return 2400; // Fallback
    }
  }

  /**
   * Obter preço de token em USD
   */
  private async getTokenPrice(symbol: string): Promise<number> {
    const cacheKey = `${symbol.toLowerCase()}_price`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.price;
      }
    }

    try {
      // Preços mock - em produção usar CoinGecko API
      const mockPrices: Record<string, number> = {
        'USDT': 1.00,
        'USDC': 1.00,
        'DAI': 1.00,
        'ETH': 2400,
      };

      const price = mockPrices[symbol] || 1;
      
      this.cache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error(`Erro ao buscar preço de ${symbol}:`, error);
      return 1; // Fallback para stablecoins
    }
  }

  /**
   * Verificar se a Safe está configurada corretamente
   */
  async verifySafeConfiguration(): Promise<{
    isValid: boolean;
    owners: string[];
    threshold: number;
    error?: string;
  }> {
    try {
      // Em produção, consultaria a Safe API ou contrato
      return {
        isValid: true,
        owners: [
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5f', // Admin 1
          '0x1234567890123456789012345678901234567890', // Admin 2
        ],
        threshold: 2, // Requer 2 assinaturas
      };
    } catch (error) {
      return {
        isValid: false,
        owners: [],
        threshold: 0,
        error: 'Erro ao verificar configuração da Safe',
      };
    }
  }

  /**
   * Obter histórico de transações da Safe
   */
  async getSafeTransactionHistory(limit: number = 10): Promise<any[]> {
    try {
      // Mock data - em produção usar Safe Transaction Service API
      return [
        {
          hash: '0x1234...5678',
          timestamp: new Date('2024-02-10T10:30:00Z'),
          type: 'incoming',
          value: '1250.50',
          token: 'USDT',
          from: '0xabcd...efgh',
          description: 'Taxa de mercado resolvido'
        },
        {
          hash: '0x2345...6789',
          timestamp: new Date('2024-02-09T15:20:00Z'),
          type: 'incoming',
          value: '890.25',
          token: 'USDC',
          from: '0xbcde...fghi',
          description: 'Taxa de mercado resolvido'
        }
      ];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Limpar cache (útil para forçar atualização)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Instância singleton
export const treasuryService = TreasuryService.getInstance();
