import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRIPS_FILE = path.join(__dirname, '..', 'trips.json');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
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

router.get('/trips', asyncHandler(async (req, res) => {
  res.json(readTrips());
}));

router.post('/trips', asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Trip name is required' });
  }

  const newTrip = {
    id: 'trip_' + Date.now().toString(),
    name,
    entryRefs: [],
    items: [],
    createdAt: new Date().toISOString(),
  };

  const trips = readTrips();
  trips.push(newTrip);
  writeTrips(trips);

  res.status(201).json(newTrip);
}));

router.post('/trips/:tripId/entries', asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { placeId, entryId } = req.body;
  if (!placeId || !entryId) {
    return res.status(400).json({ error: 'placeId and entryId are required' });
  }

  const trips = readTrips();
  const trip = trips.find((currentTrip) => currentTrip.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.entryRefs.some((ref) => ref.entryId === entryId)) {
    return res.status(409).json({ error: 'Entry already in trip' });
  }

  trip.entryRefs.push({ placeId, entryId });
  writeTrips(trips);
  res.json(trip);
}));

router.delete('/trips/:tripId/entries/:entryId', asyncHandler(async (req, res) => {
  const { tripId, entryId } = req.params;
  const trips = readTrips();
  const trip = trips.find((currentTrip) => currentTrip.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  trip.entryRefs = trip.entryRefs.filter((ref) => ref.entryId !== entryId);
  writeTrips(trips);
  res.json(trip);
}));

router.delete('/trips/:tripId', asyncHandler(async (req, res) => {
  const trips = readTrips();
  const index = trips.findIndex((trip) => trip.id === req.params.tripId);
  if (index === -1) return res.status(404).json({ error: 'Trip not found' });

  trips.splice(index, 1);
  writeTrips(trips);
  res.json({ message: 'Trip deleted' });
}));

router.post('/trips/:tripId/items', asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { place, country, note, category, status } = req.body;
  const trips = readTrips();
  const trip = trips.find((currentTrip) => currentTrip.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!trip.items) trip.items = [];

  const allowedStatuses = ['pending', 'done'];
  const newItem = {
    id: 'ti_' + Date.now().toString(),
    place: place || '',
    country: country || '',
    note: note || '',
    category: category || 'General',
    status: allowedStatuses.includes(status) ? status : 'pending',
    createdAt: new Date().toISOString(),
  };

  trip.items.push(newItem);
  writeTrips(trips);
  res.status(201).json(newItem);
}));

router.put('/trips/:tripId/items/:itemId', asyncHandler(async (req, res) => {
  const { tripId, itemId } = req.params;
  const trips = readTrips();
  const trip = trips.find((currentTrip) => currentTrip.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!trip.items) trip.items = [];

  const index = trip.items.findIndex((item) => item.id === itemId);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  const { place, country, note, category, status } = req.body;
  const allowedStatuses = ['pending', 'done'];
  if (place !== undefined) trip.items[index].place = place;
  if (country !== undefined) trip.items[index].country = country;
  if (note !== undefined) trip.items[index].note = note;
  if (category !== undefined) trip.items[index].category = category;
  if (status && allowedStatuses.includes(status)) trip.items[index].status = status;

  writeTrips(trips);
  res.json(trip.items[index]);
}));

router.delete('/trips/:tripId/items/:itemId', asyncHandler(async (req, res) => {
  const { tripId, itemId } = req.params;
  const trips = readTrips();
  const trip = trips.find((currentTrip) => currentTrip.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (!trip.items) trip.items = [];

  const index = trip.items.findIndex((item) => item.id === itemId);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  trip.items.splice(index, 1);
  writeTrips(trips);
  res.json({ message: 'Trip item deleted' });
}));

export default router;