import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import apiRoutes from './routes';
import { requestLogger, errorLogger } from './middleware/logging';
import { apiKeyAuth } from './middleware/auth';
import { startBlockchainIndexer } from './services/blockchain-indexer';
import { startProbabilitySnapshotJob } from './jobs/probability-snapshot';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const allowedOrigins = [
  'http://localhost:5173',
  'https://voxpredict.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

app.get('/health', (_req: Request, res: Response) => {
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiKeyAuth, apiRoutes);

app.post('/api/send-email', async (req: Request, res: Response) => {
  if (!resend) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not configured' });
  }

  try {
    const { to, subject, html } = req.body as {
      to?: string;
      subject?: string;
      html?: string;
    };

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: to || process.env.ADMIN_EMAIL || 'voxpredict@gmail.com',
      subject: subject || 'Test Email from VoxPredict API',
      html: html || '<p>This is a test email from VoxPredict API</p>',
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

app.use(errorLogger);

app.listen(PORT, () => {
  console.log(`VoxPredict API running on port ${PORT}`);
  const enableIndexer = process.env.ENABLE_BLOCKCHAIN_INDEXER === 'true';
  const enableSnapshotJob = process.env.ENABLE_PROBABILITY_SNAPSHOT_JOB === 'true';

  if (enableIndexer) {
    startBlockchainIndexer().catch((error) => {
      console.error('Failed to start blockchain indexer:', error);
    });
  } else {
    console.log('Blockchain indexer disabled (set ENABLE_BLOCKCHAIN_INDEXER=true to enable)');
  }

  if (enableSnapshotJob) {
    startProbabilitySnapshotJob();
  } else {
    console.log('Probability snapshot job disabled (set ENABLE_PROBABILITY_SNAPSHOT_JOB=true to enable)');
  }
});
