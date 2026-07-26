import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import entriesRouter from './modules/travel-journal/entries.routes.js';
import placesRouter from './modules/travel-journal/places.routes.js';
import tripsRouter from './modules/trip-planning/trips.routes.js';
import wishlistRouter from './modules/wishlist/wishlist.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import authenticate from './middleware/authenticate.js';
import cookieParser from 'cookie-parser';
import { addSseClient, removeSseClient } from './utils/sse.js';

const app = express();
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
        "img-src": [
          "'self'",
          "data:",
          "https://*.basemaps.cartocdn.com",
        ],
        "connect-src": [
          "'self'",
          "https://nominatim.openstreetmap.org",
        ],
      },
    },
  })
);

app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const server = createServer(app);
const io = new Server(
  server,
  process.env.NODE_ENV === 'production'
    ? {}
    : {
        cors: {
          origin: 'http://localhost:3001',
          credentials: true,
        },
      }
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPublicDir = path.join(__dirname, 'public');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Unknown API routes must return JSON instead of frontend HTML.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  express.static(frontendPublicDir, {
    setHeaders: (res, filePath) => {
      // Next.js generates hashed assets inside _next/static.
      if (
        filePath.includes(
          `${path.sep}_next${path.sep}static${path.sep}`
        )
      ) {
        res.setHeader(
          'Cache-Control',
          'public, max-age=31536000, immutable'
        );
      }

      // Exported HTML pages must always be checked for updates.
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const normalizedPath = req.path.replace(/\/$/, '');
  const htmlFile = normalizedPath
    ? path.join(frontendPublicDir, `${normalizedPath}.html`)
    : path.join(frontendPublicDir, 'index.html');

  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }

  return res.sendFile(path.join(frontendPublicDir, 'index.html'));
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
