import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

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