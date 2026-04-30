import jwt from 'jsonwebtoken';

export default function authenticate(req, res, next) {
  try {
    const token = req?.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Attach minimal user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    return next();
  } catch (err) {
    console.error('Authentication middleware error', err);
    return res.status(401).json({ error: 'Not authenticated' });
  }
}
