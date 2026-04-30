import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import entriesRouter from './routes/entries.js';
import placesRouter from './routes/places.js';
import tripsRouter from './routes/trips.js';
import wishlistRouter from './routes/wishlist.js';
import authRouter from './routes/auth.js';
import authenticate from './middleware/authenticate.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Public auth routes
app.use('/api/auth', authRouter);

// Protected resource routes (apply `authenticate` at the mount level)
app.use('/api', authenticate, placesRouter);
app.use('/api', authenticate, entriesRouter);
app.use('/api', authenticate, tripsRouter);
app.use('/api', authenticate, wishlistRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
