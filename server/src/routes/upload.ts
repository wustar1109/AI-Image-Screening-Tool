import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = express.Router();

router.use(authenticate);

router.post('/', upload.array('images'), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { projectId } = req.body;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    const images = await Promise.all(
      files.map((file) =>
        prisma.image.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/${file.filename}`,
            size: file.size,
            mimeType: file.mimetype,
            projectId,
          },
        })
      )
    );

    await prisma.project.update({
      where: { id: projectId },
      data: {
        totalImages: { increment: files.length },
      },
    });

    res.json(
      images.map((img) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        path: img.path,
        score: img.score,
        category: img.category,
      }))
    );
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: '上传失败' });
  }
});

export default router;
