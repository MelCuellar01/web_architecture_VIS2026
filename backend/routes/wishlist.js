import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WISHLIST_FILE = path.join(__dirname, '..', 'wishlist.json');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const readWishlist = () => {
  if (!fs.existsSync(WISHLIST_FILE)) {
    fs.writeFileSync(WISHLIST_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(WISHLIST_FILE, 'utf8'));
};

const writeWishlist = (data) => {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(data, null, 2));
};

router.get('/wishlist', asyncHandler(async (req, res) => {
  res.json(readWishlist());
}));

router.post('/wishlist', asyncHandler(async (req, res) => {
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
    createdAt: new Date().toISOString(),
  };

  const items = readWishlist();
  items.push(newItem);
  writeWishlist(items);
  res.status(201).json(newItem);
}));

router.put('/wishlist/:id', asyncHandler(async (req, res) => {
  const items = readWishlist();
  const index = items.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  const { place, country, status, note } = req.body;
  const allowed = ['not-visited', 'upcoming', 'done'];
  if (place) items[index].place = place;
  if (country) items[index].country = country;
  if (status && allowed.includes(status)) items[index].status = status;
  if (note !== undefined) items[index].note = note;

  writeWishlist(items);
  res.json(items[index]);
}));

router.delete('/wishlist/:id', asyncHandler(async (req, res) => {
  const items = readWishlist();
  const index = items.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Item not found' });

  items.splice(index, 1);
  writeWishlist(items);
  res.json({ message: 'Wishlist item deleted' });
}));

export default router;