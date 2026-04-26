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
const DATA_FILE = path.join(__dirname, '..', 'places.json');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const readPlaces = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

const writePlaces = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const flattenEntries = (places) =>
  places.flatMap((place) =>
    (place.entries || []).map((entry) => ({
      ...entry,
      placeId: place.id,
    }))
  );

let entries = flattenEntries(readPlaces());

const refreshEntriesCache = () => {
  entries = flattenEntries(readPlaces());
};

const removeEntriesByPlaceId = (placeId) => {
  entries = entries.filter((entry) => entry.placeId !== placeId);
};

const isMissing = (value) => value === undefined || value === null || String(value).trim() === '';

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
};

const getImageUrls = (req) => (req.files && req.files.length > 0 ? req.files.map((file) => `/uploads/${file.filename}`) : []);

const findPlace = (places, placeId) => places.find((place) => place.id === placeId);

const findEntryLocation = (places, entryId) => {
  for (const place of places) {
    const entryIndex = (place.entries || []).findIndex((entry) => entry.id === entryId);
    if (entryIndex !== -1) {
      return { place, entryIndex };
    }
  }
  return null;
};

const syncEntryToPlaces = (entry, previousPlaceId = entry.placeId) => {
  const places = readPlaces();
  const previousPlace = findPlace(places, previousPlaceId);
  const targetPlace = findPlace(places, entry.placeId);

  if (!targetPlace) {
    return null;
  }

  if (previousPlace && previousPlace.id === targetPlace.id) {
    const entryIndex = (targetPlace.entries || []).findIndex((currentEntry) => currentEntry.id === entry.id);
    if (entryIndex === -1) {
      targetPlace.entries = [...(targetPlace.entries || []), entry];
    } else {
      targetPlace.entries[entryIndex] = entry;
    }
  } else {
    if (previousPlace) {
      previousPlace.entries = (previousPlace.entries || []).filter((currentEntry) => currentEntry.id !== entry.id);
    }
    targetPlace.entries = [...(targetPlace.entries || []).filter((currentEntry) => currentEntry.id !== entry.id), entry];
  }

  writePlaces(places);
  refreshEntriesCache();
  return entry;
};

const removeEntryFromPlaces = (entryId) => {
  const places = readPlaces();
  const location = findEntryLocation(places, entryId);

  if (!location) {
    return null;
  }

  const removed = location.place.entries.splice(location.entryIndex, 1)[0];
  writePlaces(places);
  entries = entries.filter((entry) => entry.id !== entryId);
  return removed;
};

const buildEntry = (input, existingEntry = null, placeIdOverride = null) => {
  const placeId = placeIdOverride || input.placeId || existingEntry?.placeId;
  const title = input.title ?? existingEntry?.title;
  const description = input.description ?? existingEntry?.description;
  const rating = input.rating ?? existingEntry?.rating;
  const category = input.category ?? existingEntry?.category;

  if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
    return null;
  }

  const tags = input.tags !== undefined ? parseTags(input.tags) : (existingEntry?.tags || []);
  const imageUrls = input.imageUrls !== undefined ? input.imageUrls : existingEntry?.imageUrls || [];

  return {
    id: existingEntry?.id || `entry_${Date.now().toString()}`,
    placeId,
    title,
    description,
    rating: Number(rating),
    category,
    visitDate: input.visitDate ?? existingEntry?.visitDate ?? new Date().toISOString(),
    address: input.address ?? existingEntry?.address ?? '',
    tags,
    imageUrls,
    createdAt: existingEntry?.createdAt || new Date().toISOString(),
  };
};

const upsertEntry = (entry, previousPlaceId = entry.placeId) => {
  const synced = syncEntryToPlaces(entry, previousPlaceId);
  if (!synced) {
    return null;
  }

  const existingIndex = entries.findIndex((currentEntry) => currentEntry.id === entry.id);
  if (existingIndex === -1) {
    entries.push(entry);
  } else {
    entries[existingIndex] = entry;
  }

  return entry;
};

const applyImageCleanup = (existingEntry, keptImages) => {
  const oldUrls = existingEntry.imageUrls || (existingEntry.imageUrl ? [existingEntry.imageUrl] : []);
  for (const url of oldUrls) {
    if (!keptImages.includes(url)) {
      const imagePath = path.join(__dirname, '..', 'public', url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  }
};

router.get('/entries', asyncHandler(async (req, res) => {
  try {
    const allEntries = await prisma.entry.findMany({
      include: {
        place: true,
        images: true,
      },
    });

    res.json(allEntries);
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
      include: {
        place: true,
        images: true,
      },
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
    const placeId = req.params.placeId || req.body.placeId;
    const { title, description, rating, category, visitDate } = req.body;

    if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
    }

    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Create entry in database
    const newEntry = await prisma.entry.create({
      data: {
        placeId,
        title,
        description,
        rating: Number(rating),
        category,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
      },
      include: {
        place: true,
        images: true,
      },
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
  refreshEntriesCache();
  const entryId = req.params.id || req.params.entryId;
  const placeIdOverride = req.params.placeId || null;
  const existingEntry = entries.find((currentEntry) => currentEntry.id === entryId);

  if (!existingEntry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const updatedEntry = buildEntry(
    {
      ...req.body,
      imageUrls: req.body.existingImages ? parseTags(req.body.existingImages) : existingEntry.imageUrls || [],
    },
    existingEntry,
    placeIdOverride
  );

  if (!updatedEntry) {
    return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
  }

  const places = readPlaces();
  const previousLocation = findEntryLocation(places, entryId);
  if (!previousLocation) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const keptImages = req.body.existingImages ? parseTags(req.body.existingImages) : (existingEntry.imageUrls || []);
  applyImageCleanup(existingEntry, keptImages);

  updatedEntry.imageUrls = [...keptImages, ...getImageUrls(req)];

  const synced = upsertEntry(updatedEntry, existingEntry.placeId);
  if (!synced) {
    return res.status(404).json({ error: 'Place not found' });
  }

  res.json(updatedEntry);
});

const updateEntryByIdHandler = asyncHandler(async (req, res) => {
  try {
    const entryId = req.params.id;
    const existingEntry = await prisma.entry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const placeId = req.body.placeId ?? existingEntry.placeId;
    const title = req.body.title ?? existingEntry.title;
    const description = req.body.description ?? existingEntry.description;
    const rating = req.body.rating ?? existingEntry.rating;
    const category = req.body.category ?? existingEntry.category;

    if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
      return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
    }

    const place = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        placeId,
        title,
        description,
        rating: Number(rating),
        category,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : existingEntry.visitDate,
      },
      include: {
        place: true,
        images: true,
      },
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

router.put('/entries/:id', upload.array('images', 10), updateEntryByIdHandler);
router.put('/places/:placeId/entries/:entryId', upload.array('images', 10), updateEntryHandler);

const deleteEntryHandler = asyncHandler(async (req, res) => {
  refreshEntriesCache();
  const entryId = req.params.id || req.params.entryId;
  const existingEntry = entries.find((currentEntry) => currentEntry.id === entryId);

  if (!existingEntry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const removed = removeEntryFromPlaces(entryId);
  if (!removed) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const urls = removed.imageUrls || (removed.imageUrl ? [removed.imageUrl] : []);
  for (const url of urls) {
    const imagePath = path.join(__dirname, '..', 'public', url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  res.status(204).send();
});

const deleteEntryByIdHandler = asyncHandler(async (req, res) => {
  try {
    const entryId = req.params.id;

    if (isMissing(entryId)) {
      return res.status(400).json({ error: 'Entry id is required' });
    }

    const existingEntry = await prisma.entry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const deletedEntry = await prisma.entry.delete({
      where: { id: entryId },
      include: {
        place: true,
        images: true,
      },
    });

    res.json(deletedEntry);
  } catch (error) {
    console.error('Failed to delete entry:', error);
    res.status(500).json({
      error: 'Failed to delete entry from database',
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

router.delete('/entries/:id', deleteEntryByIdHandler);
router.delete('/places/:placeId/entries/:entryId', deleteEntryHandler);

router.get('/places/:placeId/entries', asyncHandler(async (req, res) => {
  refreshEntriesCache();
  const placeEntries = entries.filter((entry) => entry.placeId === req.params.placeId);
  res.json(placeEntries);
}));

router.get('/places/:placeId/entries/:entryId', asyncHandler(async (req, res) => {
  refreshEntriesCache();
  const entry = entries.find((currentEntry) => currentEntry.id === req.params.entryId && currentEntry.placeId === req.params.placeId);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
}));

export { removeEntriesByPlaceId, refreshEntriesCache };
export default router;