import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize router
const router = express.Router();

// Import contract ABIs and addresses
import VoxPredictTreasuryABI from '../../contracts/abis/VoxPredictTreasury.json';
import addresses from '../../contracts/addresses.json';

// Initialize provider
const getProvider = () => {
  const alchemyUrl = process.env.ALCHEMY_API_URL;
  if (!alchemyUrl) {
    throw new Error('ALCHEMY_API_URL not set in environment variables');
  }
  return new ethers.providers.JsonRpcProvider(alchemyUrl);
};

// Get treasury stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const provider = getProvider();
    const treasuryContract = new ethers.Contract(
      addresses.VoxPredictTreasury,
      VoxPredictTreasuryABI,
      provider
    );
    
    const stats = await treasuryContract.getTreasuryStats();
    
    const formattedStats = {
      platformBalance: ethers.utils.formatUnits(stats._platformBalance, 6), // USDT has 6 decimals
      totalCollected: ethers.utils.formatUnits(stats._totalCollected, 6),
      totalWithdrawn: ethers.utils.formatUnits(stats._totalWithdrawn, 6),
      lastWithdrawalTime: stats._lastWithdrawalTime.toNumber() > 0 
        ? new Date(stats._lastWithdrawalTime.toNumber() * 1000).toISOString() 
        : null,
      activeMarkets: stats._activeMarkets.toNumber(),
      monthlyRevenue: ethers.utils.formatUnits(stats._monthlyRevenue, 6)
    };
    
    res.status(200).json({ success: true, stats: formattedStats });
  } catch (error) {
    console.error('Error fetching treasury stats:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get Safe balance
router.get('/safe-balance', async (_req: Request, res: Response) => {
  try {
    // This would call the TreasuryService in a real implementation
    // For now, we'll return mock data
    const mockSafeData = {
      address: '0x3f12fFbbfa1D10e66462Dc41D926F9C72eDd5f5b',
      totalUsdValue: 15420.30,
      balances: [
        {
          token: 'USDT',
          symbol: 'USDT',
          balance: '10000000000', // 10,000 USDT with 6 decimals
          balanceFormatted: '10,000.00 USDT',
          usdValue: 10000.00,
          lastUpdated: new Date()
        },
        {
          token: 'ETH',
          symbol: 'ETH',
          balance: '2250000000000000000', // 2.25 ETH with 18 decimals
          balanceFormatted: '2.25 ETH',
          usdValue: 5420.30, // Assuming ETH price of $2,409.02
          lastUpdated: new Date()
        }
      ],
      lastUpdated: new Date()
    };
    
    res.status(200).json({ success: true, safeData: mockSafeData });
  } catch (error) {
    console.error('Error fetching Safe balance:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
