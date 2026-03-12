import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize router
const router = express.Router();

// Import contract ABIs and addresses
import VoxPredictVaultABI from '../../contracts/abis/VoxPredictVault.json';
import addresses from '../../contracts/addresses.json';

// Initialize provider
const getProvider = () => {
  const alchemyUrl = process.env.ALCHEMY_API_URL;
  if (!alchemyUrl) {
    throw new Error('ALCHEMY_API_URL not set in environment variables');
  }
  return new ethers.providers.JsonRpcProvider(alchemyUrl);
};

// Get user vault stats
router.get('/user/:address', async (req: Request, res: Response) => {
  try {
    const address = String(req.params.address);
    
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }
    
    const provider = getProvider();
    const vaultContract = new ethers.Contract(
      addresses.VoxPredictVault,
      VoxPredictVaultABI,
      provider
    );
    
    const userStats = await vaultContract.getUserStats(address);
    const canDeposit = await vaultContract.canDeposit(address);
    
    const formattedStats = {
      lockedBalance: ethers.utils.formatUnits(userStats.locked, 6), // USDT has 6 decimals
      isInPrediction: userStats.inPrediction,
      canDeposit,
      totalDeposited: ethers.utils.formatUnits(userStats.totalDep, 6),
      totalWithdrawn: ethers.utils.formatUnits(userStats.totalWith, 6),
      lastPredictionTime: userStats.lastPred.toNumber() > 0 
        ? new Date(userStats.lastPred.toNumber() * 1000).toISOString() 
        : null,
      predictionCount: userStats.predCount.toNumber()
    };
    
    res.status(200).json({ success: true, stats: formattedStats });
  } catch (error) {
    console.error('Error fetching user vault stats:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get user predictions
router.get('/user/:address/predictions', async (req: Request, res: Response) => {
  try {
    const address = String(req.params.address);
    
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address' });
    }
    
    const provider = getProvider();
    const vaultContract = new ethers.Contract(
      addresses.VoxPredictVault,
      VoxPredictVaultABI,
      provider
    );
    
    const predictionIds = await vaultContract.getUserPredictions(address);
    
    // Get details for each prediction
    const predictions = await Promise.all(
      predictionIds.map(async (id: any) => {
        const prediction = await vaultContract.predictions(id);
        
        return {
          id: id,
          user: prediction.user,
          amount: ethers.utils.formatUnits(prediction.amount, 6), // USDT has 6 decimals
          marketId: prediction.marketId,
          isActive: prediction.isActive,
          timestamp: new Date(prediction.timestamp.toNumber() * 1000).toISOString(),
          outcome: prediction.outcome
        };
      })
    );
    
    res.status(200).json({ success: true, predictions });
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
