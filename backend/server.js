import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import entriesRouter from './routes/entries.js';
import placesRouter from './routes/places.js';
import tripsRouter from './routes/trips.js';
import wishlistRouter from './routes/wishlist.js';
import authRouter from './routes/auth.js';
import authenticate from './middleware/authenticate.js';
import cookieParser from 'cookie-parser';
import { addSseClient, removeSseClient } from './utils/sse.js';

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
});

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

app.get('/api/events', authenticate, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  addSseClient(res);

  res.write(': connected\n\n');

  req.on('close', () => {
    removeSseClient(res);
    res.end();
  });
});

io.on('connection', (socket) => {
  socket.on('place-created', () => {
    socket.broadcast.emit('place-created');
  });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
