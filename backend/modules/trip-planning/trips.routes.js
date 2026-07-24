import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

const prisma = new PrismaClient();
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

const getUserTrips = (userId) => readTrips().filter((trip) => trip.userId === userId);
const findUserTrip = (userId, tripId) => getUserTrips(userId).find((trip) => trip.id === tripId);

router.get('/trips', asyncHandler(async (req, res) => {
  res.json(getUserTrips(req.user.userId));
}));

router.post('/trips', asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Trip name is required' });
  }

  const newTrip = {
    id: 'trip_' + Date.now().toString(),
    userId: req.user.userId,
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

  const trip = findUserTrip(req.user.userId, tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      placeId,
      userId: req.user.userId,
    },
  });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  if (trip.entryRefs.some((ref) => ref.entryId === entryId)) {
    return res.status(409).json({ error: 'Entry already in trip' });
  }

  const trips = readTrips();
  const tripIndex = trips.findIndex((currentTrip) => currentTrip.id === tripId && currentTrip.userId === req.user.userId);
  if (tripIndex === -1) return res.status(404).json({ error: 'Trip not found' });

  trips[tripIndex].entryRefs.push({ placeId, entryId });
  writeTrips(trips);
  res.json(trips[tripIndex]);
}));

router.delete('/trips/:tripId/entries/:entryId', asyncHandler(async (req, res) => {
  const { tripId, entryId } = req.params;
  const trips = readTrips();
  const tripIndex = trips.findIndex((currentTrip) => currentTrip.id === tripId && currentTrip.userId === req.user.userId);
  if (tripIndex === -1) return res.status(404).json({ error: 'Trip not found' });

  trips[tripIndex].entryRefs = trips[tripIndex].entryRefs.filter((ref) => ref.entryId !== entryId);
  writeTrips(trips);
  res.json(trips[tripIndex]);
}));

router.delete('/trips/:tripId', asyncHandler(async (req, res) => {
  const trips = readTrips();
  const index = trips.findIndex((trip) => trip.id === req.params.tripId && trip.userId === req.user.userId);
  if (index === -1) return res.status(404).json({ error: 'Trip not found' });

  trips.splice(index, 1);
  writeTrips(trips);
  res.json({ message: 'Trip deleted' });
}));

router.post('/trips/:tripId/items', asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { place, country, note, category, status } = req.body;
  const trips = readTrips();
  const tripIndex = trips.findIndex((currentTrip) => currentTrip.id === tripId && currentTrip.userId === req.user.userId);
  if (tripIndex === -1) return res.status(404).json({ error: 'Trip not found' });
  if (!trips[tripIndex].items) trips[tripIndex].items = [];

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

  trips[tripIndex].items.push(newItem);
  writeTrips(trips);
  res.status(201).json(newItem);
}));

router.put('/trips/:tripId/items/:itemId', asyncHandler(async (req, res) => {
  const { tripId, itemId } = req.params;
  const trips = readTrips();
  const tripIndex = trips.findIndex((currentTrip) => currentTrip.id === tripId && currentTrip.userId === req.user.userId);
  if (tripIndex === -1) return res.status(404).json({ error: 'Trip not found' });
  if (!trips[tripIndex].items) trips[tripIndex].items = [];

  const index = trips[tripIndex].items.findIndex((item) => item.id === itemId);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  const { place, country, note, category, status } = req.body;
  const allowedStatuses = ['pending', 'done'];
  if (place !== undefined) trips[tripIndex].items[index].place = place;
  if (country !== undefined) trips[tripIndex].items[index].country = country;
  if (note !== undefined) trips[tripIndex].items[index].note = note;
  if (category !== undefined) trips[tripIndex].items[index].category = category;
  if (status && allowedStatuses.includes(status)) trips[tripIndex].items[index].status = status;

  writeTrips(trips);
  res.json(trips[tripIndex].items[index]);
}));

router.delete('/trips/:tripId/items/:itemId', asyncHandler(async (req, res) => {
  const { tripId, itemId } = req.params;
  const trips = readTrips();
  const tripIndex = trips.findIndex((currentTrip) => currentTrip.id === tripId && currentTrip.userId === req.user.userId);
  if (tripIndex === -1) return res.status(404).json({ error: 'Trip not found' });
  if (!trips[tripIndex].items) trips[tripIndex].items = [];

  const index = trips[tripIndex].items.findIndex((item) => item.id === itemId);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  trips[tripIndex].items.splice(index, 1);
  writeTrips(trips);
  res.json({ message: 'Trip item deleted' });
}));

export default router;