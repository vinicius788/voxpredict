import express, { Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const notificationId = String(req.params.id);
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    return res.status(200).json({ success: true, updated: updated.count });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
});

router.put('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const updated = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return res.status(200).json({ success: true, updated: updated.count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
});

export default router;
