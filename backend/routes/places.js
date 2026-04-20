import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import { removeEntriesByPlaceId } from './entries.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'places.json');
const TRIPS_FILE = path.join(__dirname, '..', 'trips.json');
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

const readPlaces = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

const writePlaces = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const readTrips = () => {
  if (!fs.existsSync(TRIPS_FILE)) {
    fs.writeFileSync(TRIPS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf8'));
};

const writeTrips = (data) => {
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(data, null, 2));
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

router.get('/places', asyncHandler(async (req, res) => {
  res.json(readPlaces());
}));

router.post('/places', asyncHandler(async (req, res) => {
  const { city, country } = req.body;
  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }

  const newPlace = {
    id: 'place_' + Date.now().toString(),
    city,
    country,
    entries: [],
    createdAt: new Date().toISOString(),
  };

  const places = readPlaces();
  places.push(newPlace);
  writePlaces(places);

  res.status(201).json(newPlace);
}));

router.get('/places/:id/entries', asyncHandler(async (req, res) => {
  const places = readPlaces();
  const place = places.find((currentPlace) => currentPlace.id === req.params.id);

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  res.json(place.entries || []);
}));

router.post('/places/:id/entries', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, rating, category, visitDate, address, tags } = req.body;

  if (isMissing(title) || isMissing(description) || isMissing(rating) || isMissing(category)) {
    return res.status(400).json({ error: 'title, description, rating and category are required' });
  }

  const places = readPlaces();
  const place = places.find((currentPlace) => currentPlace.id === id);

  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const newEntry = {
    id: 'entry_' + Date.now().toString(),
    placeId: id,
    title,
    description,
    rating: Number(rating),
    category,
    visitDate: visitDate || new Date().toISOString(),
    address: address || '',
    tags: parseTags(tags),
    imageUrls: getImageUrls(req),
    createdAt: new Date().toISOString(),
  };

  place.entries = [...(place.entries || []), newEntry];
  writePlaces(places);

  res.status(201).json(newEntry);
}));

router.delete('/places/:placeId', asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const places = readPlaces();
  const placeIndex = places.findIndex((place) => place.id === placeId);

  if (placeIndex === -1) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const [removed] = places.splice(placeIndex, 1);

  for (const entry of removed.entries || []) {
    const urls = entry.imageUrls || (entry.imageUrl ? [entry.imageUrl] : []);
    for (const url of urls) {
      const imagePath = path.join(__dirname, '..', 'public', url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  }

  const trips = readTrips();
  let tripsChanged = false;
  for (const trip of trips) {
    const before = trip.entryRefs.length;
    trip.entryRefs = trip.entryRefs.filter((ref) => ref.placeId !== placeId);
    if (trip.entryRefs.length !== before) tripsChanged = true;
  }
  if (tripsChanged) writeTrips(trips);

  removeEntriesByPlaceId(placeId);
  writePlaces(places);
  res.json({ message: 'Place deleted' });
}));

export default router;