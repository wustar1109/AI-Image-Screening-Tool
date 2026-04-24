import express from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { analyzeImage } from '../services/aiService.js';

const router = express.Router();

router.use(authenticate);

router.post('/:projectId/start', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
      include: { images: true },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    await prisma.project.update({
      where: { id: req.params.projectId },
      data: { status: 'processing' },
    });

    const unprocessedImages = project.images.filter(
      (img) => img.category === null || img.category === undefined
    );

    for (const image of unprocessedImages) {
      try {
        const result = await analyzeImage(image.path);

        const isSelected = result.score >= 70;

        await prisma.image.update({
          where: { id: image.id },
          data: {
            score: result.score,
            category: isSelected ? 'selected' : 'discarded',
            aiResult: JSON.stringify(result),
          },
        });
      } catch (error) {
        console.error(`Failed to analyze image ${image.id}:`, error);
      }
    }

    const images = await prisma.image.findMany({
      where: { projectId: req.params.projectId },
    });

    const selectedCount = images.filter((i) => i.category === 'selected').length;
    const discardedCount = images.filter((i) => i.category === 'discarded').length;

    await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        status: 'completed',
        processedCount: images.length,
      },
    });

    await prisma.userStats.upsert({
      where: { userId: req.userId },
      update: {
        totalProcessed: { increment: images.length },
        totalSelected: { increment: selectedCount },
        totalDiscarded: { increment: discardedCount },
        totalTimeSaved: { increment: images.length * 5 },
      },
      create: {
        userId: req.userId!,
        totalProcessed: images.length,
        totalSelected: selectedCount,
        totalDiscarded: discardedCount,
        totalTimeSaved: images.length * 5,
      },
    });

    res.json({ success: true, processed: images.length });
  } catch (error) {
    console.error('Screening start error:', error);
    res.status(500).json({ message: '筛选失败' });
  }
});

router.get('/:projectId/status', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    const images = await prisma.image.findMany({
      where: { projectId: req.params.projectId },
    });

    const processed = images.filter(
      (img) => img.category !== null && img.category !== undefined
    ).length;

    res.json({
      status: project.status,
      total: images.length,
      processed,
      progress: images.length > 0 ? Math.round((processed / images.length) * 100) : 0,
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: '获取状态失败' });
  }
});

export default router;
