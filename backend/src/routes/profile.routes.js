import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { User } from "../models/User.js";
import { RatingLog } from "../models/RatingLog.js";    // ⬅️ NEW

const router = Router();

// helper to get rating info by TPIN
async function getRatingForTpin(tpin) {
  const notes = await RatingLog.find({ tpin })
    .sort({ createdAt: -1 })
    .lean();

  if (!notes.length) {
    return { summary: null, history: [] };
  }

  const total = notes.reduce((sum, n) => sum + n.score, 0);
  const avg = total / notes.length;

  return {
    summary: {
      average: avg,
      latest: notes[0].score,
      count: notes.length,
    },
    history: notes.map((n) => ({
      score: n.score,
      comment: n.comment,
      createdAt: n.createdAt,
    })),
  };
}

// GET /api/profile/me
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const myConfirmed = await ClassSession.find({
    teacher: req.user.id,
    status: "adminConfirmed",
  }).lean();
  const unpaid = await ClassSession.find({
    teacher: req.user.id,
    status: "adminConfirmed",
    paid: false,
  }).lean();

  const totalCompleted = myConfirmed.length;
  const remainingBalance = unpaid.reduce(
    (sum, c) => sum + c.hours * c.hourlyRate,
    0
  );

  const { summary, history } = await getRatingForTpin(user.tpin);

  res.json({
    id: user._id,
    name: user.name,
    tpin: user.tpin,
    role: user.role,
    totals: { totalCompleted, remainingBalance },
    ratingSummary: summary,     // { average, latest, count } or null
    ratingHistory: history,     // [] if none
  });
});

// GET /api/profile/:id (admin can view others)
router.get("/:id", auth, isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ error: "Not found" });

  const classes = await ClassSession.find({ teacher: user._id }).lean();
  const remainingBalance = classes
    .filter((c) => c.status === "adminConfirmed" && !c.paid)
    .reduce((s, c) => s + c.hours * c.hourlyRate, 0);

  const { summary, history } = await getRatingForTpin(user.tpin);

  res.json({
    user,
    remainingBalance,
    ratingSummary: summary,
    ratingHistory: history,
  });
});

export default router;
