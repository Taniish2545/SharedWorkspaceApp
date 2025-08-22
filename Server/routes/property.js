
import express from "express";
import Property from "../models/property.js";   // your schema

const router = express.Router();

// GET all properties
router.get("/", async (req, res) => {
  try {
    const props = await Property.find();
    res.json({ success: true, data: props });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST new property
router.post("/", async (req, res) => {
  try {
    const prop = await Property.create(req.body);
    res.status(201).json({ success: true, data: prop });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single property
router.get("/:id", async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: "Property not found" });
    res.json({ success: true, data: prop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// UPDATE property by id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const prop = await Property.findByIdAndUpdate(id, req.body, { new: true });

    if (!prop) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    res.json({ success: true, data: prop });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
// ADD photo to property
router.post("/:id/photos", async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    const prop = await Property.findById(id);
    if (!prop) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    // push into photos array
    prop.photos.push(url);
    await prop.save();

    res.json({ success: true, data: prop });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


export default router;
