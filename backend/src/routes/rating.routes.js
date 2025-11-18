import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { RatingLog } from "../models/RatingLog.js";

const router = Router();

// all rating endpoints are admin-only
router.use(auth, isAdmin);

/**
 * POST /api/ratings
 * Body: { tpin, score, comment }
 * Appends a new rating entry for that TPIN.
 */
router.post("/", async (req, res, next) => {
  try {
    const { tpin, score, comment } = req.body || {};

    if (!tpin) return res.status(400).json({ error: "tpin is required" });

    const user = await User.findOne({ tpin }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // score MUST be provided and numeric
    let value = Number(score);
    if (Number.isNaN(value)) {
      return res.status(400).json({ error: "score is required and must be a number" });
    }
    if (value < 0) value = 0;
    if (value > 5) value = 5;

    const note = await RatingLog.create({
      tpin,
      score: value,
      comment: comment ?? "",
      createdBy: req.user.id,
    });

    res.status(201).json({
      id: note._id,
      tpin: note.tpin,
      score: note.score,
      comment: note.comment,
      createdAt: note.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ratings/:tpin
 * Returns ALL rating notes for this TPIN, newest → oldest.
 */
router.get("/:tpin", async (req, res, next) => {
  try {
    const tpin = req.params.tpin;
    const user = await User.findOne({ tpin }).select("name tpin role").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const notes = await RatingLog.find({ tpin })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name tpin role")
      .lean();

    res.json({
      user,
      notes: notes.map((n) => ({
        id: n._id,
        score: n.score,
        comment: n.comment,
        createdAt: n.createdAt,
        createdBy: n.createdBy
          ? { name: n.createdBy.name, tpin: n.createdBy.tpin, role: n.createdBy.role }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
