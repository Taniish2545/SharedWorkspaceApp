import express from "express";
import Workspace from "../models/workspace.js";  // schema

const router = express.Router();

// GET all workspaces (optionally filter by owner)
// GET all workspaces (with optional filters)
router.get("/", async (req, res) => {
  try {
    const query = {};

    // filter by owner
    if (req.query.owner) {
      query.owner = req.query.owner;
    }

    // filter by smoking
    if (req.query.smoking) {
      query.smoking = req.query.smoking === "true";
    }

    // filter by minimum seats
    if (req.query.seats) {
      query.seats = { $gte: Number(req.query.seats) };
    }

    // filter by max price
    if (req.query.price) {
      query.price = { $lte: Number(req.query.price) };
    }

    // filter by lease term
    if (req.query.term) {
      query.term = req.query.term;
    }

    // filter by available date
    if (req.query.availableFrom) {
      query.availableFrom = { $lte: new Date(req.query.availableFrom) };
    }

    // property-related filters (nested)
    const propFilter = {};
    if (req.query.address) propFilter.address = new RegExp(req.query.address, "i");
    if (req.query.neighborhood) propFilter.neighborhood = new RegExp(req.query.neighborhood, "i");
    if (req.query.sqft) propFilter.sqft = { $gte: Number(req.query.sqft) };
    if (req.query.parking) propFilter.parking = req.query.parking === "true";
    if (req.query.transit) propFilter.transit = req.query.transit === "true";

    let wsQuery = Workspace.find(query).populate("property").populate("owner");

    // apply property filter if needed
    if (Object.keys(propFilter).length > 0) {
      wsQuery = wsQuery.where("property").elemMatch(propFilter);
    }

    let ws = await wsQuery.exec();

    // sort handling
    if (req.query.sort) {
      const sortField = req.query.sort.split("-")[0];
      const sortDir = req.query.sort.endsWith("desc") ? -1 : 1;

      ws = ws.sort((a, b) => {
        if (sortField === "price") return (a.price - b.price) * sortDir;
        if (sortField === "date") return (new Date(a.availableFrom) - new Date(b.availableFrom)) * sortDir;
        if (sortField === "rating") {
          const avgA = a.ratings.length ? a.ratings.reduce((s, r) => s + r.value, 0) / a.ratings.length : 0;
          const avgB = b.ratings.length ? b.ratings.reduce((s, r) => s + r.value, 0) / b.ratings.length : 0;
          return (avgA - avgB) * sortDir;
        }
        return 0;
      });
    }

    res.json({ success: true, data: ws });
  } catch (err) {
    console.error("❌ Workspace fetch error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET single workspace by ID
router.get("/:id", async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id)
      .populate("property")
      .populate("owner");

    if (!ws) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    res.json({ success: true, data: ws });
  } catch (err) {
    console.error("❌ Workspace fetch error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// CREATE workspace
router.post("/", async (req, res) => {
  try {
    const ws = await Workspace.create(req.body);
    res.status(201).json({ success: true, data: ws });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// UPDATE workspace
router.put("/:id", async (req, res) => {
  try {
    const ws = await Workspace.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });
    res.json({ success: true, data: ws });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE workspace
router.delete("/:id", async (req, res) => {
  try {
    const ws = await Workspace.findByIdAndDelete(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });
    res.json({ success: true, message: "Workspace deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ADD photo
router.post("/:id/photos", async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });
    if (!req.body.url) return res.status(400).json({ success: false, message: "Photo URL required" });

    ws.photos.push(req.body.url);
    await ws.save();
    res.json({ success: true, data: ws });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// POST rating (add or update for a user)
router.post("/:id/rate", async (req, res) => {
  try {
    const { value, userId } = req.body;   // frontend must send these
    if (!value || !userId) return res.status(400).json({ success: false, message: "Value and userId required" });

    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    // ✅ if same user already rated → update instead of duplicate
    const existing = ws.ratings.find(r => r.by.toString() === userId);
    if (existing) {
      existing.value = value;
    } else {
      ws.ratings.push({ value, by: userId });
    }

    await ws.save();
    res.json({ success: true, data: ws });
  } catch (err) {
    console.error("❌ Rating error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST review (always append)
router.post("/:id/review", async (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || !userId) return res.status(400).json({ success: false, message: "Text and userId required" });

    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ success: false, message: "Workspace not found" });

    ws.reviews.push({ text, by: userId });
    await ws.save();

    res.json({ success: true, data: ws });
  } catch (err) {
    console.error("❌ Review error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
