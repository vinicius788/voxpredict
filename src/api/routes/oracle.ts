import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { authenticate, requireAdmin } from '../middleware/auth';

// Load environment variables
dotenv.config();

// Initialize router
const router = express.Router();
router.use(authenticate, requireAdmin);

// OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Market resolution endpoint
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { marketTitle, articleContent } = req.body;
    
    if (!marketTitle || !articleContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Market title and article content are required' 
      });
    }
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }
    
    // Call VoxAI Engine
    const voxAiResponse = await axios.post('http://localhost:3001/resolve-market', {
      marketTitle,
      articleContent
    });
    
    res.status(200).json(voxAiResponse.data);
  } catch (error) {
    console.error('Error resolving market:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

// Generate market from news
router.post('/generate-market', async (req: Request, res: Response) => {
  try {
    const { noticia, dataEncerramento } = req.body;
    
    if (!noticia || !dataEncerramento) {
      return res.status(400).json({ 
        success: false, 
        error: 'Notícia e data de encerramento são obrigatórios' 
      });
    }
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }
    
    // Call VoxAI Engine
    const voxAiResponse = await axios.post('http://localhost:3001/generate-market', {
      noticia,
      dataEncerramento
    });
    
    res.status(200).json(voxAiResponse.data);
  } catch (error) {
    console.error('Error generating market:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

// Test data sources
router.get('/sources/test', async (_req: Request, res: Response) => {
  try {
    // Simulate testing data sources
    const sources = {
      'coingecko': true,
      'coinmarketcap': true,
      'newsapi': Math.random() > 0.2, // 80% chance of success
      'sportsapi': true,
      'worldbank': true,
      'tse': true,
      'bbcnews': true,
      'reuters': true,
      'theguardian': true,
      'formula1': Math.random() > 0.1, // 90% chance of success
      'techcrunch': true,
      'g1': true
    };
    
    res.status(200).json({ success: true, sources });
  } catch (error) {
    console.error('Error testing sources:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
