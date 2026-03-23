import express from 'express';
import marketsRouter from './markets';
import positionsRouter from './positions';
import usersRouter from './users';
import notificationsRouter from './notifications';
import financeRouter from './finance';
import adminRouter from './admin';
import aiRouter from './ai';
import authRouter from './auth';
import oracleRouter from './oracle';
import treasuryRouter from './treasury';
import vaultRouter from './vault';
import categoriesRouter from './categories';
import proposalsRouter from './proposals';
import templatesRouter from './templates';
import leaderboardRouter from './leaderboard';
import polymarketRouter from './polymarket';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/markets', marketsRouter);
router.use('/positions', positionsRouter);
router.use('/users', usersRouter);
router.use('/notifications', notificationsRouter);
router.use('/finance', financeRouter);
router.use('/admin', adminRouter);
router.use('/ai', aiRouter);
router.use('/oracle', oracleRouter);
router.use('/treasury', treasuryRouter);
router.use('/vault', vaultRouter);
router.use('/categories', categoriesRouter);
router.use('/proposals', proposalsRouter);
router.use('/templates', templatesRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/polymarket', polymarketRouter);

export default router;
