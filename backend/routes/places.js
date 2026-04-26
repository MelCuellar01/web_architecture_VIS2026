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

const placeInclude = {
  entries: {
    include: {
      images: true,
    },
  },
};

router.get('/places', asyncHandler(async (req, res) => {
  try {
    const places = await prisma.place.findMany({
      include: placeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(places);
  } catch (error) {
    console.error('Failed to fetch places from database:', error);
    res.status(500).json({
      error: 'Failed to load places from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

router.post('/places', asyncHandler(async (req, res) => {
  try {
    const { city, country } = req.body;

    if (isMissing(city) || isMissing(country)) {
      return res.status(400).json({ error: 'City and country are required' });
    }

    const newPlace = await prisma.place.create({
      data: {
        city,
        country,
      },
      include: placeInclude,
    });

    res.status(201).json(newPlace);
  } catch (error) {
    console.error('Failed to create place:', error);
    res.status(500).json({
      error: 'Failed to create place in database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

router.get('/places/:id/entries', asyncHandler(async (req, res) => {
  try {
    const place = await prisma.place.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const entries = await prisma.entry.findMany({
      where: { placeId: req.params.id },
      include: {
        place: true,
        images: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
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

router.post('/places/:id/entries', upload.array('images', 10), asyncHandler(async (req, res) => {
  try {
    const placeId = req.params.id;
    const { title, description, rating, category, visitDate } = req.body;

    if (isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'title, description, rating and category are required' });
    }

    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const imageUrls = [
      ...parseList(req.body.imageUrls),
      ...parseList(req.body.existingImages),
      ...(req.files || []).map((file) => `/uploads/${file.filename}`),
    ];

    const data = {
      placeId,
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
      include: {
        place: true,
        images: true,
      },
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Failed to create place entry:', error);
    res.status(500).json({
      error: 'Failed to create entry in database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

router.delete('/places/:placeId', asyncHandler(async (req, res) => {
  try {
    const { placeId } = req.params;

    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: {
        entries: {
          include: {
            images: true,
          },
        },
      },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const imageUrls = place.entries.flatMap((entry) => entry.images.map((image) => image.imageUrl));
    deleteFiles(imageUrls);

    await prisma.place.delete({
      where: { id: placeId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete place:', error);
    res.status(500).json({
      error: 'Failed to delete place from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
}));

export default router;