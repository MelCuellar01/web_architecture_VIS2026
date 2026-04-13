import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'places.json');
const TRIPS_FILE = path.join(__dirname, 'trips.json');
const WISHLIST_FILE = path.join(__dirname, 'wishlist.json');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage })

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Helper functions
const readPlaces = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
};

const writePlaces = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

const readTrips = () => {
  if (!fs.existsSync(TRIPS_FILE)) {
    fs.writeFileSync(TRIPS_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(TRIPS_FILE, 'utf8');
  return JSON.parse(data);
};

const writeTrips = (data) => {
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(data, null, 2));
};

const readWishlist = () => {
  if (!fs.existsSync(WISHLIST_FILE)) {
    fs.writeFileSync(WISHLIST_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(WISHLIST_FILE, 'utf8');
  return JSON.parse(data);
};

const writeWishlist = (data) => {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(data, null, 2));
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Get all places (including their entries)
app.get('/api/places', asyncHandler(async (req, res) => {
  const places = readPlaces();
  res.json(places);
}));

// 2. Add a new place (City/Country)
app.post('/api/places', asyncHandler(async (req, res) => {
  const { city, country } = req.body;
  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required' });
  }

  const newPlace = {
    id: 'place_' + Date.now().toString(),
    city,
    country,
    entries: [],
    createdAt: new Date().toISOString()
  };

  const places = readPlaces();
  places.push(newPlace);
  writePlaces(places);

  res.status(201).json(newPlace);
}));

// 3. Add a diary entry to a specific place (supports multiple file uploads)
app.post('/api/places/:placeId/entries', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const { title, description, category, rating, visitDate, address, tags } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const places = readPlaces();
  const placeIndex = places.findIndex(p => p.id === placeId);
  
  if (placeIndex === -1) {
    return res.status(404).json({ error: 'Place not found' });
  }

  // Determine image URLs if files were uploaded
  const imageUrls = req.files && req.files.length > 0
    ? req.files.map(f => `/uploads/${f.filename}`)
    : [];

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try { parsedTags = JSON.parse(tags); } catch { parsedTags = []; }
  }

  const newEntry = {
    id: 'entry_' + Date.now().toString(),
    title,
    description: description || '',
    category: category || 'General',
    rating: parseInt(rating) || 0,
    visitDate: visitDate || new Date().toISOString(),
    address: address || '',
    tags: parsedTags,
    imageUrls: imageUrls,
    createdAt: new Date().toISOString()
  };

  places[placeIndex].entries.push(newEntry);
  writePlaces(places);

  res.status(201).json(newEntry);
}));

// 4. Update (edit) a diary entry (supports adding more images)
app.put('/api/places/:placeId/entries/:entryId', upload.array('images', 10), asyncHandler(async (req, res) => {
  const { placeId, entryId } = req.params;
  const { title, description, category, rating, visitDate, address, existingImages, tags } = req.body;

  const places = readPlaces();
  const placeIndex = places.findIndex(p => p.id === placeId);
  if (placeIndex === -1) return res.status(404).json({ error: 'Place not found' });

  const entryIndex = places[placeIndex].entries.findIndex(e => e.id === entryId);
  if (entryIndex === -1) return res.status(404).json({ error: 'Entry not found' });

  const entry = places[placeIndex].entries[entryIndex];

  // Parse existing images the user wants to keep
  let keptImages = [];
  if (existingImages) {
    try { keptImages = JSON.parse(existingImages); } catch { keptImages = []; }
  }

  // Delete removed images from disk
  const oldUrls = entry.imageUrls || (entry.imageUrl ? [entry.imageUrl] : []);
  for (const url of oldUrls) {
    if (!keptImages.includes(url)) {
      const imagePath = path.join(__dirname, 'public', url);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  }

  // New uploaded images
  const newImageUrls = req.files && req.files.length > 0
    ? req.files.map(f => `/uploads/${f.filename}`)
    : [];

  entry.title = title || entry.title;
  entry.description = description !== undefined ? description : entry.description;
  entry.category = category || entry.category;
  entry.rating = rating !== undefined ? parseInt(rating) : entry.rating;
  entry.visitDate = visitDate || entry.visitDate;
  entry.address = address !== undefined ? address : (entry.address || '');
  if (tags) {
    try { entry.tags = JSON.parse(tags); } catch { /* keep existing */ }
  }
  entry.imageUrls = [...keptImages, ...newImageUrls];
  delete entry.imageUrl; // clean up legacy field

  writePlaces(places);
  res.json(entry);
}));

// 5. Delete a diary entry from a specific place
app.delete('/api/places/:placeId/entries/:entryId', asyncHandler(async (req, res) => {
  const { placeId, entryId } = req.params;

  const places = readPlaces();
  const placeIndex = places.findIndex(p => p.id === placeId);

  if (placeIndex === -1) {
    return res.status(404).json({ error: 'Place not found' });
  }

  const entryIndex = places[placeIndex].entries.findIndex(e => e.id === entryId);

  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  const [removed] = places[placeIndex].entries.splice(entryIndex, 1);

  // Delete associated image files
  const urls = removed.imageUrls || (removed.imageUrl ? [removed.imageUrl] : []);
  for (const url of urls) {
    const imagePath = path.join(__dirname, 'public', url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  writePlaces(places);
  res.json({ message: 'Entry deleted' });
}));

// ===== Trips =====

// Get all trips
app.get('/api/trips', asyncHandler(async (req, res) => {
  const trips = readTrips();
  res.json(trips);
}));

// Create a trip
app.post('/api/trips', asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Trip name is required' });
  }
  const newTrip = {
    id: 'trip_' + Date.now().toString(),
    name,
    entryRefs: [],
    createdAt: new Date().toISOString()
  };
  const trips = readTrips();
  trips.push(newTrip);
  writeTrips(trips);
  res.status(201).json(newTrip);
}));

// Add an entry to a trip
app.post('/api/trips/:tripId/entries', asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { placeId, entryId } = req.body;
  if (!placeId || !entryId) {
    return res.status(400).json({ error: 'placeId and entryId are required' });
  }
  const trips = readTrips();
  const trip = trips.find(t => t.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.entryRefs.some(r => r.entryId === entryId)) {
    return res.status(409).json({ error: 'Entry already in trip' });
  }
  trip.entryRefs.push({ placeId, entryId });
  writeTrips(trips);
  res.json(trip);
}));

// Remove an entry from a trip
app.delete('/api/trips/:tripId/entries/:entryId', asyncHandler(async (req, res) => {
  const { tripId, entryId } = req.params;
  const trips = readTrips();
  const trip = trips.find(t => t.id === tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  trip.entryRefs = trip.entryRefs.filter(r => r.entryId !== entryId);
  writeTrips(trips);
  res.json(trip);
}));

// Delete a trip
app.delete('/api/trips/:tripId', asyncHandler(async (req, res) => {
  const trips = readTrips();
  const index = trips.findIndex(t => t.id === req.params.tripId);
  if (index === -1) return res.status(404).json({ error: 'Trip not found' });
  trips.splice(index, 1);
  writeTrips(trips);
  res.json({ message: 'Trip deleted' });
}));

// ===== Wishlist =====

// Get all wishlist items
app.get('/api/wishlist', asyncHandler(async (req, res) => {
  const items = readWishlist();
  res.json(items);
}));

// Create a wishlist item
app.post('/api/wishlist', asyncHandler(async (req, res) => {
  const { place, country, status, note } = req.body;
  if (!place || !country) {
    return res.status(400).json({ error: 'Place and country are required' });
  }
  const allowed = ['not-visited', 'upcoming', 'done'];
  const newItem = {
    id: 'wish_' + Date.now().toString(),
    place,
    country,
    status: allowed.includes(status) ? status : 'not-visited',
    note: note || '',
    createdAt: new Date().toISOString()
  };
  const items = readWishlist();
  items.push(newItem);
  writeWishlist(items);
  res.status(201).json(newItem);
}));

// Update a wishlist item
app.put('/api/wishlist/:id', asyncHandler(async (req, res) => {
  const items = readWishlist();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  const { place, country, status, note } = req.body;
  const allowed = ['not-visited', 'upcoming', 'done'];
  if (place) items[idx].place = place;
  if (country) items[idx].country = country;
  if (status && allowed.includes(status)) items[idx].status = status;
  if (note !== undefined) items[idx].note = note;
  writeWishlist(items);
  res.json(items[idx]);
}));

// Delete a wishlist item
app.delete('/api/wishlist/:id', asyncHandler(async (req, res) => {
  const items = readWishlist();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  items.splice(idx, 1);
  writeWishlist(items);
  res.json({ message: 'Wishlist item deleted' });
}));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
