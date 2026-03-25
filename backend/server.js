import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'places.json');

app.use(cors());
app.use(express.json());

// Helper function to read data
const readPlaces = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
};

// Helper function to write data
const writePlaces = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/api/places', asyncHandler(async (req, res) => {
  const places = readPlaces();
  res.json(places);
}));

app.post('/api/places', asyncHandler(async (req, res) => {
  const { name, description, location, imageUrl, visitDate } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  const newPlace = {
    id: Date.now().toString(),
    name,
    description: description || '',
    location,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1000&auto=format&fit=crop',
    visitDate: visitDate || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const places = readPlaces();
  places.push(newPlace);
  writePlaces(places);

  res.status(201).json(newPlace);
}));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
