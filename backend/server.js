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

// 3. Add a diary entry to a specific place (supports file upload)
app.post('/api/places/:placeId/entries', upload.single('image'), asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const { title, description, category, rating, visitDate } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const places = readPlaces();
  const placeIndex = places.findIndex(p => p.id === placeId);
  
  if (placeIndex === -1) {
    return res.status(404).json({ error: 'Place not found' });
  }

  // Determine image URL if file was uploaded
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newEntry = {
    id: 'entry_' + Date.now().toString(),
    title,
    description: description || '',
    category: category || 'General',
    rating: parseInt(rating) || 0,
    visitDate: visitDate || new Date().toISOString(),
    imageUrl: imageUrl,
    createdAt: new Date().toISOString()
  };

  places[placeIndex].entries.push(newEntry);
  writePlaces(places);

  res.status(201).json(newEntry);
}));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
