import express from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { images: true },
        },
      },
    });

    res.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        totalImages: p.totalImages,
        processedCount: p.processedCount,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: '获取项目列表失败' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    res.json({
      id: project.id,
      name: project.name,
      status: project.status,
      totalImages: project.totalImages,
      processedCount: project.processedCount,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: '获取项目失败' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        userId: req.userId!,
      },
    });

    res.json({
      id: project.id,
      name: project.name,
      status: project.status,
      totalImages: project.totalImages,
      processedCount: project.processedCount,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: '创建项目失败' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: '删除项目失败' });
  }
});

router.get('/:id/images', async (req: AuthRequest, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    const images = await prisma.image.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      images.map((img) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        path: img.path,
        score: img.score,
        category: img.category,
        aiResult: img.aiResult ? JSON.parse(img.aiResult) : null,
      }))
    );
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ message: '获取图片列表失败' });
  }
});

export default router;
