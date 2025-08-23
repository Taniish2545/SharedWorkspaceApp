import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { nanoid } from 'nanoid';
import connectDB from './db.js';
import authRoutes from './routes/auth.js';
import secureRoutes from './routes/secure.js';
import propertyRoutes from './routes/property.js';
import workspaceRoutes from './routes/workspace.js';

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get('/', (_req, res) => res.json({ ok: true }));

// mount routers
app.use('/api/auth', authRoutes);
app.use('/api/secure', secureRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/workspaces", workspaceRoutes);

// Ensure DB connects first, then start server
try {
  await connectDB();
  console.log("✅ DB connected");

  const PORT = process.env.PORT || 3000;
  const HOST = '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on :${PORT}`);
  });
} catch (err) {
  console.error("❌ DB connection error:", err?.message || err);
  process.exit(1);
}

/*// ===== In-memory stores (Phase 1) =====
let users = [];
let properties = [];
let workspaces = [];

const ok = (data, msg='OK') => ({ success: true, data, message: msg });
const fail = (msg='Error') => ({ success: false, message: msg });

// ===== Users =====
app.post('/api/users', (req, res) => {
const { name, phone, email, role, password } = req.body || {};
if (!name || !phone || !email || !role || !password) return res.json(fail('All fields required.'));
  const user = { id: nanoid(), name, phone, email, role, password, ownerRatings: [] };
  users.push(user);
  res.json(ok(user, 'User created'));
});

app.post('/api/login', (req, res) => {
const { email, role, password } = req.body || {};
const user = users.find(u =>
  u.email.toLowerCase() === String(email).toLowerCase() &&
  u.role === role &&
  u.password === password
);

  if (!user) return res.json(fail('Invalid credentials'));
  res.json(ok(user, 'Login successful'));
});

// ===== Properties =====
app.get('/api/properties', (req, res) => {
  let list = [...properties];
  if (req.query.ownerId) list = list.filter(p => p.ownerId === req.query.ownerId);
  res.json(ok(list));
});

app.post('/api/properties', (req, res) => {
  const { ownerId, address, neighborhood, sqft, parking, transit } = req.body || {};
  if (!ownerId || !address || !neighborhood || sqft == null) return res.json(fail('All fields required.'));
  const prop = {
    id: nanoid(),
    ownerId,
    address,
    neighborhood,
    sqft: Number(sqft),
    parking: !!parking,
    transit: !!transit,
    photos: [] // BONUS: photos
  };
  properties.push(prop);
  res.json(ok(prop, 'Property added'));
});

app.put('/api/properties/:id', (req, res) => {
  const p = properties.find(x => x.id === req.params.id);
  if (!p) return res.json(fail('Property not found'));
  Object.assign(p, req.body);
  res.json(ok(p, 'Property updated'));
});

app.delete('/api/properties/:id', (req, res) => {
  properties = properties.filter(x => x.id !== req.params.id);
  res.json(ok(null, 'Property deleted'));
});

// ===== Workspaces =====
app.post('/api/workspaces', (req, res) => {
  const { ownerId, propertyId, type, seats, smoking, availableFrom, term, price } = req.body || {};
  if (!ownerId || !propertyId || !type || seats == null || !availableFrom || !term || price == null) {
    return res.json(fail('All fields required.'));
  }
  const ws = {
    id: nanoid(),
    ownerId, propertyId, type,
    seats: Number(seats),
    smoking: !!smoking,
    availableFrom,
    term,
    price: Number(price),
    photos: [],   // BONUS
    ratings: [],  // [{userId, value}]
    reviews: []   // [{userId, text, date}]
  };
  workspaces.push(ws);
  res.json(ok(ws, 'Workspace added'));
});

app.get('/api/workspaces', (req, res) => {
  const { sort, address, neighborhood, sqft, parking, transit, seats, smoking, availableFrom, term, price } = req.query || {};

  let list = workspaces.map(w => {
    const prop = properties.find(p => p.id === w.propertyId) || null;
    const avg = w.ratings && w.ratings.length
      ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2))
      : 0;
    return { ...w, property: prop, avgRating: avg };
  });

  // === FILTERING ===
  if (address) list = list.filter(w => w.property?.address?.toLowerCase().includes(address.toLowerCase()));
  if (neighborhood) list = list.filter(w => w.property?.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase()));
  if (sqft) list = list.filter(w => (w.property?.sqft || 0) >= Number(sqft));
  if (parking) list = list.filter(w => w.property?.parking === (parking === "true"));
  if (transit) list = list.filter(w => w.property?.transit === (transit === "true"));
  if (seats) list = list.filter(w => w.seats >= Number(seats));
  if (smoking) list = list.filter(w => w.smoking === (smoking === "true"));
  if (availableFrom) list = list.filter(w => new Date(w.availableFrom) >= new Date(availableFrom));
  if (term) list = list.filter(w => w.term === term);
  if (price) list = list.filter(w => w.price <= Number(price));

  // === SORTING (existing) ===
  if (sort === 'rating-asc') list.sort((a,b)=>a.avgRating - b.avgRating);
  if (sort === 'rating-desc') list.sort((a,b)=>b.avgRating - a.avgRating);
  if (sort === 'date-asc') list.sort((a,b)=>a.availableFrom.localeCompare(b.availableFrom));
  if (sort === 'date-desc') list.sort((a,b)=>b.availableFrom.localeCompare(a.availableFrom));
  if (sort === 'price-asc') list.sort((a,b)=>a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b)=>b.price - a.price);

  res.json(ok(list));
});
// BONUS endpoints Property photo: body { url }
app.post('/api/properties/:id/photos', (req, res) => {
  const p = properties.find(x => x.id === req.params.id);
  if (!p) return res.json(fail('Property not found'));
  const { url } = req.body || {};
  if (!url) return res.json(fail('Photo URL required'));
  p.photos.push(url);
  res.json(ok(p, 'Photo added to property'));
});

// Workspace photo: body { url }
app.post('/api/workspaces/:id/photos', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { url } = req.body || {};
  if (!url) return res.json(fail('Photo URL required'));
  w.photos.push(url);
  res.json(ok(w, 'Photo added to workspace'));
});

// Rate workspace: body { userId, value (1..5) }
app.post('/api/workspaces/:id/ratings', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { userId, value } = req.body || {};
  const v = Number(value);
  if (!userId || !(v >= 1 && v <= 5)) return res.json(fail('userId and rating 1–5 required'));
  const idx = w.ratings.findIndex(r => r.userId === userId);
  if (idx >= 0) w.ratings[idx].value = v; else w.ratings.push({ userId, value: v });
  res.json(ok(w, 'Rating saved'));
});

// Review workspace: body { userId, text }
app.post('/api/workspaces/:id/reviews', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { userId, text } = req.body || {};
  if (!userId || !text) return res.json(fail('userId and text required'));
  w.reviews.push({ userId, text, date: new Date().toISOString() });
  res.json(ok(w, 'Review added'));
});

// Owner rates coworker (simple demo): body { ownerId, value (1..5) }
app.post('/api/users/:id/ratingsFromOwner', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.json(fail('User not found'));
  const v = Number((req.body || {}).value);
  if (!(v >= 1 && v <= 5)) return res.json(fail('Rating 1–5 required'));
  user.ownerRatings.push({ ownerId: (req.body || {}).ownerId || 'owner', value: v });
  res.json(ok(user, 'Coworker rated by owner'));
});
// Update workspace
app.put('/api/workspaces/:id', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json(fail('Workspace not found'));
  
  Object.assign(w, req.body);
  res.json(ok(w, 'Workspace updated'));
});

// Delete workspace
app.delete('/api/workspaces/:id', (req, res) => {
  const before = workspaces.length;
  workspaces = workspaces.filter(x => x.id !== req.params.id);
  if (workspaces.length === before) return res.status(404).json(fail('Workspace not found'));
  
  res.json(ok(null, 'Workspace deleted'));
});
// ===== Workspace Details =====
// Get workspace details by ID (with property + owner info)
app.get('/api/workspaces/:id', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));

  const prop = properties.find(p => p.id === w.propertyId) || null;
  const owner = users.find(u => u.id === w.ownerId) || null;

  const avg = w.ratings && w.ratings.length
    ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2))
    : 0;

  res.json(ok({
    ...w,
    property: prop,
    avgRating: avg,
    owner: owner ? { name: owner.name, phone: owner.phone, email: owner.email } : null
  }));
});
// --- server.js (bottom of file) ---

// Pick a starting port just once (don’t use a global variable named PORT anymore)
const START_PORT = Number(process.env.PORT) || 3000;
*/
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { nanoid } from 'nanoid';
import connectDB from './db.js';              // default import
import authRoutes from './routes/auth.js';
import secureRoutes from './routes/secure.js';
import propertyRoutes from './routes/property.js';
import workspaceRoutes from './routes/workspace.js';

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get('/', (_req, res) => res.json({ ok: true }));

// mount routers (this also removes the “declared but never read” warning)
app.use('/api/auth', authRoutes);
app.use('/api/secure', secureRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/workspaces", workspaceRoutes);

// Start server with auto-fallback if port is busy
const START_PORT = Number(process.env.PORT) || 3000;
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`⚠️ Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}
// Ensure DB connects first, then start server
try {
  await connectDB();
  console.log("✅ DB connected");
  startServer(START_PORT);
} catch (err) {
  console.error("❌ DB connection error:", err?.message || err);
  process.exit(1);
}

/*// ===== In-memory stores (Phase 1) =====
let users = [];
let properties = [];
let workspaces = [];

const ok = (data, msg='OK') => ({ success: true, data, message: msg });
const fail = (msg='Error') => ({ success: false, message: msg });

// ===== Users =====
app.post('/api/users', (req, res) => {
const { name, phone, email, role, password } = req.body || {};
if (!name || !phone || !email || !role || !password) return res.json(fail('All fields required.'));
  const user = { id: nanoid(), name, phone, email, role, password, ownerRatings: [] };
  users.push(user);
  res.json(ok(user, 'User created'));
});

app.post('/api/login', (req, res) => {
const { email, role, password } = req.body || {};
const user = users.find(u =>
  u.email.toLowerCase() === String(email).toLowerCase() &&
  u.role === role &&
  u.password === password
);

  if (!user) return res.json(fail('Invalid credentials'));
  res.json(ok(user, 'Login successful'));
});

// ===== Properties =====
app.get('/api/properties', (req, res) => {
  let list = [...properties];
  if (req.query.ownerId) list = list.filter(p => p.ownerId === req.query.ownerId);
  res.json(ok(list));
});

app.post('/api/properties', (req, res) => {
  const { ownerId, address, neighborhood, sqft, parking, transit } = req.body || {};
  if (!ownerId || !address || !neighborhood || sqft == null) return res.json(fail('All fields required.'));
  const prop = {
    id: nanoid(),
    ownerId,
    address,
    neighborhood,
    sqft: Number(sqft),
    parking: !!parking,
    transit: !!transit,
    photos: [] // BONUS: photos
  };
  properties.push(prop);
  res.json(ok(prop, 'Property added'));
});

app.put('/api/properties/:id', (req, res) => {
  const p = properties.find(x => x.id === req.params.id);
  if (!p) return res.json(fail('Property not found'));
  Object.assign(p, req.body);
  res.json(ok(p, 'Property updated'));
});

app.delete('/api/properties/:id', (req, res) => {
  properties = properties.filter(x => x.id !== req.params.id);
  res.json(ok(null, 'Property deleted'));
});

// ===== Workspaces =====
app.post('/api/workspaces', (req, res) => {
  const { ownerId, propertyId, type, seats, smoking, availableFrom, term, price } = req.body || {};
  if (!ownerId || !propertyId || !type || seats == null || !availableFrom || !term || price == null) {
    return res.json(fail('All fields required.'));
  }
  const ws = {
    id: nanoid(),
    ownerId, propertyId, type,
    seats: Number(seats),
    smoking: !!smoking,
    availableFrom,
    term,
    price: Number(price),
    photos: [],   // BONUS
    ratings: [],  // [{userId, value}]
    reviews: []   // [{userId, text, date}]
  };
  workspaces.push(ws);
  res.json(ok(ws, 'Workspace added'));
});

app.get('/api/workspaces', (req, res) => {
  const { sort, address, neighborhood, sqft, parking, transit, seats, smoking, availableFrom, term, price } = req.query || {};

  let list = workspaces.map(w => {
    const prop = properties.find(p => p.id === w.propertyId) || null;
    const avg = w.ratings && w.ratings.length
      ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2))
      : 0;
    return { ...w, property: prop, avgRating: avg };
  });

  // === FILTERING ===
  if (address) list = list.filter(w => w.property?.address?.toLowerCase().includes(address.toLowerCase()));
  if (neighborhood) list = list.filter(w => w.property?.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase()));
  if (sqft) list = list.filter(w => (w.property?.sqft || 0) >= Number(sqft));
  if (parking) list = list.filter(w => w.property?.parking === (parking === "true"));
  if (transit) list = list.filter(w => w.property?.transit === (transit === "true"));
  if (seats) list = list.filter(w => w.seats >= Number(seats));
  if (smoking) list = list.filter(w => w.smoking === (smoking === "true"));
  if (availableFrom) list = list.filter(w => new Date(w.availableFrom) >= new Date(availableFrom));
  if (term) list = list.filter(w => w.term === term);
  if (price) list = list.filter(w => w.price <= Number(price));

  // === SORTING (existing) ===
  if (sort === 'rating-asc') list.sort((a,b)=>a.avgRating - b.avgRating);
  if (sort === 'rating-desc') list.sort((a,b)=>b.avgRating - a.avgRating);
  if (sort === 'date-asc') list.sort((a,b)=>a.availableFrom.localeCompare(b.availableFrom));
  if (sort === 'date-desc') list.sort((a,b)=>b.availableFrom.localeCompare(a.availableFrom));
  if (sort === 'price-asc') list.sort((a,b)=>a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b)=>b.price - a.price);

  res.json(ok(list));
});
// BONUS endpoints Property photo: body { url }
app.post('/api/properties/:id/photos', (req, res) => {
  const p = properties.find(x => x.id === req.params.id);
  if (!p) return res.json(fail('Property not found'));
  const { url } = req.body || {};
  if (!url) return res.json(fail('Photo URL required'));
  p.photos.push(url);
  res.json(ok(p, 'Photo added to property'));
});

// Workspace photo: body { url }
app.post('/api/workspaces/:id/photos', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { url } = req.body || {};
  if (!url) return res.json(fail('Photo URL required'));
  w.photos.push(url);
  res.json(ok(w, 'Photo added to workspace'));
});

// Rate workspace: body { userId, value (1..5) }
app.post('/api/workspaces/:id/ratings', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { userId, value } = req.body || {};
  const v = Number(value);
  if (!userId || !(v >= 1 && v <= 5)) return res.json(fail('userId and rating 1–5 required'));
  const idx = w.ratings.findIndex(r => r.userId === userId);
  if (idx >= 0) w.ratings[idx].value = v; else w.ratings.push({ userId, value: v });
  res.json(ok(w, 'Rating saved'));
});

// Review workspace: body { userId, text }
app.post('/api/workspaces/:id/reviews', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));
  const { userId, text } = req.body || {};
  if (!userId || !text) return res.json(fail('userId and text required'));
  w.reviews.push({ userId, text, date: new Date().toISOString() });
  res.json(ok(w, 'Review added'));
});

// Owner rates coworker (simple demo): body { ownerId, value (1..5) }
app.post('/api/users/:id/ratingsFromOwner', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.json(fail('User not found'));
  const v = Number((req.body || {}).value);
  if (!(v >= 1 && v <= 5)) return res.json(fail('Rating 1–5 required'));
  user.ownerRatings.push({ ownerId: (req.body || {}).ownerId || 'owner', value: v });
  res.json(ok(user, 'Coworker rated by owner'));
});
// Update workspace
app.put('/api/workspaces/:id', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json(fail('Workspace not found'));
  
  Object.assign(w, req.body);
  res.json(ok(w, 'Workspace updated'));
});

// Delete workspace
app.delete('/api/workspaces/:id', (req, res) => {
  const before = workspaces.length;
  workspaces = workspaces.filter(x => x.id !== req.params.id);
  if (workspaces.length === before) return res.status(404).json(fail('Workspace not found'));
  
  res.json(ok(null, 'Workspace deleted'));
});
// ===== Workspace Details =====
// Get workspace details by ID (with property + owner info)
app.get('/api/workspaces/:id', (req, res) => {
  const w = workspaces.find(x => x.id === req.params.id);
  if (!w) return res.json(fail('Workspace not found'));

  const prop = properties.find(p => p.id === w.propertyId) || null;
  const owner = users.find(u => u.id === w.ownerId) || null;

  const avg = w.ratings && w.ratings.length
    ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2))
    : 0;

  res.json(ok({
    ...w,
    property: prop,
    avgRating: avg,
    owner: owner ? { name: owner.name, phone: owner.phone, email: owner.email } : null
  }));
});
// --- server.js (bottom of file) ---

// Pick a starting port just once (don’t use a global variable named PORT anymore)
const START_PORT = Number(process.env.PORT) || 3000;
*/
