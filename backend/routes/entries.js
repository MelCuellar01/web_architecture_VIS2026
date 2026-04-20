import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
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
  refreshEntriesCache();
  res.json(entries);
}));

router.get('/entries/:id', asyncHandler(async (req, res) => {
  refreshEntriesCache();
  const entry = entries.find((currentEntry) => currentEntry.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
}));

const createEntryHandler = asyncHandler(async (req, res) => {
  refreshEntriesCache();
  const placeId = req.params.placeId || req.body.placeId;
  const { title, description, rating, category, visitDate, address } = req.body;

  if (isMissing(placeId) || isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
    return res.status(400).json({ error: 'placeId, title, description, rating and category are required' });
  }

  const places = readPlaces();
  const place = findPlace(places, placeId);
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const newEntry = {
    id: `entry_${Date.now().toString()}`,
    placeId,
    title,
    description,
    rating: Number(rating),
    category,
    visitDate: visitDate || new Date().toISOString(),
    address: address || '',
    tags: parseTags(req.body.tags),
    imageUrls: [...getImageUrls(req), ...(Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [])],
    createdAt: new Date().toISOString(),
  };

  place.entries = [...(place.entries || []), newEntry];
  writePlaces(places);
  entries.push({ ...newEntry });

  res.status(201).json(newEntry);
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

router.put('/entries/:id', upload.array('images', 10), updateEntryHandler);
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

router.delete('/entries/:id', deleteEntryHandler);
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