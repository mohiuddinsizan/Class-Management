import { Router } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
const router = Router();

// POST /api/auth/login { tpin, password }
router.post("/login", async (req, res) => {
  const { tpin, password } = req.body || {};
  const user = await User.findOne({ tpin });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  const ok = await user.validatePassword(password);
  if (!ok) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({
    token,
    user: { id: user._id, name: user.name, tpin: user.tpin, role: user.role }
  });
});

export default router;
