import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    return res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    const invalidMsg = 'E-Mail oder Passwort ungültig.';
    if (!user) return res.status(401).json({ error: invalidMsg });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: invalidMsg });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '24h' });

    console.log('Setting auth cookie for:', user.email);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get current user (verify JWT from cookie)
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const payload = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    return res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;
