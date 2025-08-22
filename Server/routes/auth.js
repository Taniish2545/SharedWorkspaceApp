// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const ok   = (data, message='OK') => ({ success: true, data, message });
const fail = (message='Error')   => ({ success: false, message });

// REGISTER
router.post("/register", async (req, res) => {
  const { name, phone, email, role, password } = req.body || {};
  if (!name || !phone || !email || !role || !password) {
    return res.json(fail("All fields required."));
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json(fail("Email already in use"));

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, phone, email, role, passwordHash, ownerRatings: [] });

  res.status(201).json(ok({ id: user._id, name, phone, email, role }, "User created"));
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body || {};

    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json(fail("Invalid email or password"));

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json(fail("Invalid email or password"));

    // 3. Check role
    if (user.role !== role) {
      return res.status(400).json(fail("Invalid role. Please select the correct role."));
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json(ok(
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
      "Login successful"
    ));
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json(fail("Server error"));
  }
});

// Current user info
router.get("/me", requireAuth, async (req, res) => {
  const me = await User.findById(req.user.id).select("-passwordHash");
  res.json(ok(me));
});

export default router;
