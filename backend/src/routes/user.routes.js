import { Router } from "express";
import { User } from "../models/User.js";
import { auth, isAdmin } from "../middleware/auth.js";

const router = Router();
router.use(auth, isAdmin);

// add at top: router.use(auth);  // if you want non-admins to list teachers, keep auth only
// List users (admins see all; teachers may need just teachers)
router.get("/", async (req, res) => {
  const role = req.query.role;
  const q = role ? { role } : {};
  const users = await User.find(q).select("name tpin role").lean();
  res.json(users);
});


// POST /api/users  { name, tpin, role, password, confirmPassword }
router.post("/", async (req, res, next) => {
  try {
    const { name, tpin, role, password, confirmPassword } = req.body || {};
    if (!["admin", "teacher"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (!password || password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });

    const user = new User({ name, tpin, role, passwordHash: "tmp" });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ id: user._id, name: user.name, tpin: user.tpin, role: user.role });
  } catch (e) { next(e); }
});

// PATCH /api/users/:id/password { password, confirmPassword }
router.patch("/:id/password", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password, confirmPassword } = req.body || {};
    if (!password || password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
    await user.setPassword(password);
    await user.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
