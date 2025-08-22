
// Server/routes/secure.js
import express from 'express';
import { requireAuth, mustBeOwner } from '../middleware/auth.js';
import Property from '../models/property.js';
import Workspace from '../models/workspace.js';

const router = express.Router();
const ok   = (data, message='OK') => ({ success: true, data, message });
const fail = (message='Error')   => ({ success: false, message });

/* -------- Properties -------- */
router.post('/properties', requireAuth, async (req, res) => {
  const { address, neighborhood, sqft, parking, transit } = req.body || {};
  const prop = await Property.create({
    address, neighborhood, sqft, parking, transit,
    photos: [], owner: req.user.id
  });
  res.status(201).json(ok(prop, 'Property created'));
});

router.get('/properties', requireAuth, async (req, res) => {
  const query = {};
  if (req.query.mine === 'true') query.owner = req.user.id;
  const list = await Property.find(query).populate('owner', 'name email phone role');
  res.json(ok(list));
});

router.get('/properties/:id', requireAuth, async (req, res) => {
  const p = await Property.findById(req.params.id).populate('owner', 'name email phone role');
  if (!p) return res.status(404).json(fail('Not found'));
  res.json(ok(p));
});

router.put('/properties/:id',
  requireAuth,
  mustBeOwner(async (req) => (await Property.findById(req.params.id))?.owner),
  async (req, res) => {
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ok(updated, 'Property updated'));
  }
);

router.delete('/properties/:id',
  requireAuth,
  mustBeOwner(async (req) => (await Property.findById(req.params.id))?.owner),
  async (req, res) => {
    await Property.findByIdAndDelete(req.params.id);
    res.json(ok({ deleted: true }, 'Property deleted'));
  }
);

router.post('/properties/:id/photos',
  requireAuth,
  mustBeOwner(async (req) => (await Property.findById(req.params.id))?.owner),
  async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.json(fail('url required'));
    const p = await Property.findById(req.params.id);
    p.photos.push(url);
    await p.save();
    res.json(ok(p, 'Photo added'));
  }
);

/* -------- Workspaces -------- */
router.post('/workspaces', requireAuth, async (req, res) => {
  const { type, seats, price, term, smoking, propertyId } = req.body || {};
  const prop = await Property.findById(propertyId);
  if (!prop) return res.status(400).json(fail('Invalid propertyId'));
  if (prop.owner.toString() !== req.user.id) return res.status(403).json(fail('You do not own this property'));

  const ws = await Workspace.create({
    type, seats, price, term, smoking, photos: [],
    property: prop._id, owner: req.user.id
  });
  res.status(201).json(ok(ws, 'Workspace created'));
});

router.get('/workspaces', requireAuth, async (_req, res) => {
  let results = await Workspace.find().populate('property').populate('owner', 'name email phone');
  results = results.map(w => {
    const avg = w.ratings?.length ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2)) : 0;
    return { ...w.toObject(), avgRating: avg };
  });
  res.json(ok(results));
});

router.get('/workspaces/mine', requireAuth, async (req, res) => {
  const list = await Workspace.find({ owner: req.user.id }).populate('property');
  res.json(ok(list));
});

router.get('/workspaces/:id', requireAuth, async (req, res) => {
  const w = await Workspace.findById(req.params.id).populate('property').populate('owner', 'name email phone');
  if (!w) return res.status(404).json(fail('Not found'));
  const avg = w.ratings?.length ? Number((w.ratings.reduce((s, r) => s + r.value, 0) / w.ratings.length).toFixed(2)) : 0;
  res.json(ok({ ...w.toObject(), avgRating: avg }));
});

router.put('/workspaces/:id',
  requireAuth,
  mustBeOwner(async (req) => (await Workspace.findById(req.params.id))?.owner),
  async (req, res) => {
    const updated = await Workspace.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ok(updated, 'Workspace updated'));
  }
);

router.delete('/workspaces/:id',
  requireAuth,
  mustBeOwner(async (req) => (await Workspace.findById(req.params.id))?.owner),
  async (req, res) => {
    await Workspace.findByIdAndDelete(req.params.id);
    res.json(ok({ deleted: true }, 'Workspace deleted'));
  }
);

router.post('/workspaces/:id/photos',
  requireAuth,
  mustBeOwner(async (req) => (await Workspace.findById(req.params.id))?.owner),
  async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.json(fail('url required'));
    const w = await Workspace.findById(req.params.id);
    w.photos.push(url);
    await w.save();
    res.json(ok(w, 'Photo added'));
  }
);

router.post('/workspaces/:id/ratings', requireAuth, async (req, res) => {
  const { value } = req.body || {};
  if (![1,2,3,4,5].includes(Number(value))) return res.json(fail('value must be 1–5'));
  const w = await Workspace.findById(req.params.id);
  if (!w) return res.status(404).json(fail('Not found'));
  const idx = w.ratings.findIndex(r => r.by?.toString() === req.user.id);
  if (idx >= 0) w.ratings[idx].value = Number(value);
  else w.ratings.push({ value: Number(value), by: req.user.id });
  await w.save();
  res.json(ok(w, 'Rating saved'));
});

router.post('/workspaces/:id/reviews', requireAuth, async (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return res.json(fail('text required'));
  const w = await Workspace.findById(req.params.id);
  if (!w) return res.status(404).json(fail('Not found'));
  w.reviews.push({ text: text.trim(), by: req.user.id });
  await w.save();
  res.json(ok(w, 'Review added'));
});

export default router;
