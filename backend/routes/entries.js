import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};

const filePathFromUrl = (url) => {
  const baseDir = path.join(__dirname, '..', 'public', 'uploads');
  const filePath = path.resolve(baseDir, url.replace(/^\/+/, ''));
  // Ensure resolved path is within uploads directory to prevent directory traversal
  if (!filePath.startsWith(baseDir)) {
    throw new Error('Invalid file path');
  }
  return filePath;
};

const deleteFiles = (urls) => {
  for (const url of urls) {
    const filePath = filePathFromUrl(url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

const entryInclude = {
  place: true,
  images: true,
};

const findEntryById = async (entryId, userId) => prisma.entry.findFirst({
  where: { id: entryId, userId },
  include: {
    images: true,
  },
});

router.get('/entries', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const entries = await prisma.entry.findMany({
      where: { userId },
      include: entryInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    console.error('Failed to fetch entries from database:', error);
    res.status(500).json({
      error: 'Failed to load entries from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

router.get('/entries/:id', asyncHandler(async (req, res) => {
  try {
    const entry = await prisma.entry.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      include: entryInclude,
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Failed to fetch entry from database:', error);
    res.status(500).json({
      error: 'Failed to load entry from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

const createEntryHandler = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const placeId = req.params.placeId || req.body.placeId;
    const { title, description, rating, category, visitDate } = req.body;

    if (isMissing(placeId)) {
      return res.status(400).json({ error: 'placeId is required' });
    }
    if (isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'title, description, rating and category are required' });
    }

    const place = await prisma.place.findFirst({
      where: { id: placeId, userId },
    });

    if (!place) {
      return res.status(404).json({ error: `Place not found with ID: ${placeId}` });
    }

    const imageUrls = [
      ...parseList(req.body.imageUrls),
      ...parseList(req.body.existingImages),
      ...(req.files || []).map((file) => `/uploads/${file.filename}`),
    ];

    const data = {
      placeId,
      userId,
      title,
      description,
      rating: Number(rating),
      category,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
    };

    if (imageUrls.length > 0) {
      data.images = {
        create: [...new Set(imageUrls)].map((imageUrl) => ({ imageUrl })),
      };
    }

    const newEntry = await prisma.entry.create({
      data,
      include: entryInclude,
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Failed to create entry:', error);
    res.status(500).json({
      error: 'Failed to create entry in database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

router.post('/entries', upload.array('images', 10), createEntryHandler);
router.post('/places/:placeId/entries', upload.array('images', 10), createEntryHandler);

const updateEntryHandler = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const entryId = req.params.id || req.params.entryId;
    const placeIdOverride = req.params.placeId || null;

    const existingEntry = await prisma.entry.findFirst({
      where: { id: entryId, userId },
      include: { images: true },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const placeId = placeIdOverride || req.body.placeId || existingEntry.placeId;
    const title = req.body.title ?? existingEntry.title;
    const description = req.body.description ?? existingEntry.description;
    const rating = req.body.rating ?? existingEntry.rating;
    const category = req.body.category ?? existingEntry.category;

    if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
    }

    const place = await prisma.place.findFirst({
      where: { id: placeId, userId },
    });

    if (!place) {
      return res.status(404).json({ error: `Place not found with ID: ${placeId}` });
    }

    const currentImageUrls = existingEntry.images.map((image) => image.imageUrl);
    const keptImageUrls = req.body.existingImages !== undefined
      ? parseList(req.body.existingImages)
      : req.body.imageUrls !== undefined
        ? parseList(req.body.imageUrls)
        : currentImageUrls;
    const uniqueKeptUrls = [...new Set(keptImageUrls)];
    const removedUrls = currentImageUrls.filter((url) => !uniqueKeptUrls.includes(url));
    const uploadedUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);

    if (removedUrls.length > 0) {
      deleteFiles(removedUrls);
      await prisma.entryImage.deleteMany({
        where: {
          entryId,
          imageUrl: { in: removedUrls },
        },
      });
    }

    if (uploadedUrls.length > 0) {
      await prisma.entryImage.createMany({
        data: uploadedUrls.map((imageUrl) => ({ entryId, imageUrl })),
      });
    }

    await prisma.entry.update({
      where: { id: entryId },
      data: {
        placeId,
        userId,
        title,
        description,
        rating: Number(rating),
        category,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : existingEntry.visitDate,
      },
    });

    const updatedEntry = await prisma.entry.findFirst({
      where: { id: entryId, userId },
      include: entryInclude,
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Failed to update entry:', error);
    res.status(500).json({
      error: 'Failed to update entry in database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

router.put('/entries/:id', upload.array('images', 10), updateEntryHandler);
router.put('/places/:placeId/entries/:entryId', upload.array('images', 10), updateEntryHandler);

const deleteEntryHandler = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const entryId = req.params.id || req.params.entryId;

    if (isMissing(entryId)) {
      return res.status(400).json({ error: 'Entry id is required' });
    }

    const existingEntry = await findEntryById(entryId, userId);

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    deleteFiles(existingEntry.images.map((image) => image.imageUrl));

    await prisma.entry.delete({ where: { id: entryId } });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete entry:', error);
    res.status(500).json({
      error: 'Failed to delete entry from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

router.delete('/entries/:id', deleteEntryHandler);
router.delete('/places/:placeId/entries/:entryId', deleteEntryHandler);

router.get('/places/:placeId/entries', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const rawPlaceId = req.params.placeId;
    const placeId = String(rawPlaceId ?? '').trim().replace(/^"(.*)"$/, '$1');

    if (isMissing(placeId)) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const place = await prisma.place.findFirst({
      where: { id: placeId, userId },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const entries = await prisma.entry.findMany({
      where: { placeId, userId },
      include: entryInclude,
    });

    res.json(entries);
  } catch (error) {
    console.error('Failed to fetch place entries from database:', error);
    res.status(500).json({
      error: 'Failed to load place entries from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

router.get('/places/:placeId/entries/:entryId', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const entry = await prisma.entry.findFirst({
      where: {
        id: req.params.entryId,
        placeId: req.params.placeId,
        userId,
      },
      include: entryInclude,
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Failed to fetch place entry from database:', error);
    res.status(500).json({
      error: 'Failed to load place entry from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

export default router;