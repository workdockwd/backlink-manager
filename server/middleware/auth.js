import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'linkvault_super_secret_key_123';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
export function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) { /* ignore invalid token for optional routes */ }
  }
  next();
}
