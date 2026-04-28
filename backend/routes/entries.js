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

const filePathFromUrl = (url) => path.join(__dirname, '..', 'public', url.replace(/^\/+/, ''));

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

const findEntryById = async (entryId) => prisma.entry.findUnique({
  where: { id: entryId },
  include: {
    images: true,
  },
});

router.get('/entries', asyncHandler(async (req, res) => {
  try {
    const entries = await prisma.entry.findMany({
      include: entryInclude,
      orderBy: {
        createdAt: 'desc',
      },
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
    const entry = await prisma.entry.findUnique({
      where: { id: req.params.id },
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
    // Get placeId from URL params first, then from request body
    const placeId = req.params.placeId || req.body.placeId;
    const { title, description, rating, category, visitDate } = req.body;

    // Validate required fields
    if (isMissing(placeId)) {
      return res.status(400).json({ error: 'placeId is required' });
    }
    if (isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'title, description, rating and category are required' });
    }

    // Verify place exists using Prisma (keep ID as string, no conversion)
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ error: `Place not found with ID: ${placeId}` });
    }

    // Process images from multiple sources
    const imageUrls = [
      ...parseList(req.body.imageUrls),
      ...parseList(req.body.existingImages),
      ...(req.files || []).map((file) => `/uploads/${file.filename}`),
    ];

    // Build entry data
    const data = {
      placeId,
      title,
      description,
      rating: Number(rating),
      category,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
    };

    // Add images if any
    if (imageUrls.length > 0) {
      data.images = {
        create: [...new Set(imageUrls)].map((imageUrl) => ({ imageUrl })),
      };
    }

    // Create entry with Prisma
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
    const entryId = req.params.id || req.params.entryId;
    const placeIdOverride = req.params.placeId || null;

    // Fetch existing entry
    const existingEntry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        images: true,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Determine which placeId to use (from URL params, request body, or existing entry)
    const placeId = placeIdOverride || req.body.placeId || existingEntry.placeId;
    const title = req.body.title ?? existingEntry.title;
    const description = req.body.description ?? existingEntry.description;
    const rating = req.body.rating ?? existingEntry.rating;
    const category = req.body.category ?? existingEntry.category;

    // Validate required fields
    if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
    }

    // Verify place exists with Prisma (keep ID as string, no conversion)
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ error: `Place not found with ID: ${placeId}` });
    }

    // Handle image updates
    const currentImageUrls = existingEntry.images.map((image) => image.imageUrl);
    const keptImageUrls = req.body.existingImages !== undefined
      ? parseList(req.body.existingImages)
      : req.body.imageUrls !== undefined
        ? parseList(req.body.imageUrls)
        : currentImageUrls;
    const uniqueKeptUrls = [...new Set(keptImageUrls)];
    const removedUrls = currentImageUrls.filter((url) => !uniqueKeptUrls.includes(url));
    const uploadedUrls = (req.files || []).map((file) => `/uploads/${file.filename}`);

    // Delete removed images from filesystem
    if (removedUrls.length > 0) {
      deleteFiles(removedUrls);
      await prisma.entryImage.deleteMany({
        where: {
          entryId,
          imageUrl: {
            in: removedUrls,
          },
        },
      });
    }

    // Add uploaded images to database
    if (uploadedUrls.length > 0) {
      await prisma.entryImage.createMany({
        data: uploadedUrls.map((imageUrl) => ({
          entryId,
          imageUrl,
        })),
      });
    }

    // Update the entry with Prisma
    await prisma.entry.update({
      where: { id: entryId },
      data: {
        placeId,
        title,
        description,
        rating: Number(rating),
        category,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : existingEntry.visitDate,
      },
    });

    // Fetch and return updated entry
    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entryId },
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
    const entryId = req.params.id || req.params.entryId;

    if (isMissing(entryId)) {
      return res.status(400).json({ error: 'Entry id is required' });
    }

    const existingEntry = await findEntryById(entryId);

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    deleteFiles(existingEntry.images.map((image) => image.imageUrl));

    await prisma.entry.delete({
      where: { id: entryId },
    });

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
    const rawPlaceId = req.params.placeId;
    const placeId = String(rawPlaceId ?? '').trim().replace(/^"(.*)"$/, '$1');

    console.log('[GET /places/:placeId/entries]', {
      originalUrl: req.originalUrl,
      rawPlaceId,
      normalizedPlaceId: placeId,
    });

    if (isMissing(placeId)) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    // Check if place exists using Prisma
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Get entries for the place
    const entries = await prisma.entry.findMany({
      where: { placeId },
      include: entryInclude,
    });

    // Return 200 with entries (empty array if no entries exist)
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
    const entry = await prisma.entry.findFirst({
      where: {
        id: req.params.entryId,
        placeId: req.params.placeId,
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