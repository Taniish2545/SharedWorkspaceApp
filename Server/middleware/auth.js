
// Server/middleware/auth.js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function mustBeOwner(getOwnerId) {
  return async (req, res, next) => {
    const ownerId = await getOwnerId(req);
    if (!ownerId) return res.status(404).json({ success: false, message: 'Not found' });
    if (ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}
// Server/middleware/auth.js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function mustBeOwner(getOwnerId) {
  return async (req, res, next) => {
    const ownerId = await getOwnerId(req);
    if (!ownerId) return res.status(404).json({ success: false, message: 'Not found' });
    if (ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}
