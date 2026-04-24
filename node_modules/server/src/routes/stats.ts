import express from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    let stats = await prisma.userStats.findUnique({
      where: { userId: req.userId },
    });

    if (!stats) {
      stats = await prisma.userStats.create({
        data: {
          userId: req.userId!,
        },
      });
    }

    res.json({
      totalProcessed: stats.totalProcessed,
      totalDiscarded: stats.totalDiscarded,
      totalTimeSaved: stats.totalTimeSaved,
      totalSelected: stats.totalSelected,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

export default router;
