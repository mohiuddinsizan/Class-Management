import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { User } from "../models/User.js";

const router = Router();

// GET /api/profile/me
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const myConfirmed = await ClassSession.find({ teacher: req.user.id, status: "adminConfirmed" }).lean();
  const unpaid = await ClassSession.find({ teacher: req.user.id, status: "adminConfirmed", paid: false }).lean();

  const totalCompleted = myConfirmed.length;
  const remainingBalance = unpaid.reduce((sum, c) => sum + c.hours * c.hourlyRate, 0);

  res.json({
    id: user._id, name: user.name, tpin: user.tpin, role: user.role,
    totals: { totalCompleted, remainingBalance }
  });
});

// GET /api/profile/:id (admin can view others)
router.get("/:id", auth, isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  const classes = await ClassSession.find({ teacher: user._id }).lean();
  const remainingBalance = classes.filter(c => c.status === "adminConfirmed" && !c.paid)
                                  .reduce((s, c) => s + c.hours * c.hourlyRate, 0);
  res.json({ user, remainingBalance });
});

export default router;
