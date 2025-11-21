import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { UploadedVideo } from "../models/UploadedVideo.js";   // ⬅️ NEW
import { User } from "../models/User.js";
import { RatingLog } from "../models/RatingLog.js";

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

// ---------------------------------------------------------
// GET /api/profile/me   (teacher + editor + admin)
// ---------------------------------------------------------
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const role = user.role;

  const { summary, history } = await getRatingForTpin(user.tpin);

  // ===========================================================
  // ROLE: TEACHER  (existing logic stays the same)
  // ===========================================================
  if (role === "teacher") {
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

    return res.json({
      id: user._id,
      name: user.name,
      tpin: user.tpin,
      role,
      totals: { totalCompleted, remainingBalance },
      ratingSummary: summary,
      ratingHistory: history,
    });
  }

  // ===========================================================
  // ROLE: EDITOR  (NEW PROFILE LOGIC)
  // ===========================================================
  if (role === "editor") {
    const uploads = await UploadedVideo.find({
      editor: req.user.id,
    }).lean();

    const approved = uploads.filter((u) => u.status === "adminApproved");

    const unpaid = uploads.filter(
      (u) => u.status === "adminApproved" && u.paid === false
    );

    const remainingBalance = unpaid.reduce((sum, u) => sum + u.rate, 0);

    return res.json({
      id: user._id,
      name: user.name,
      tpin: user.tpin,
      role,
      totals: {
        totalUploaded: uploads.length,
        totalApproved: approved.length,
        remainingBalance,
      },
      ratingSummary: summary,
      ratingHistory: history,
    });
  }

  // ===========================================================
  // ROLE: ADMIN — show basic info only
  // ===========================================================
  return res.json({
    id: user._id,
    name: user.name,
    tpin: user.tpin,
    role,
    ratingSummary: summary,
    ratingHistory: history,
  });
});

// ---------------------------------------------------------
// GET /api/profile/:id (admin can view teacher OR editor)
// ---------------------------------------------------------
router.get("/:id", auth, isAdmin, async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ error: "Not found" });

  const role = user.role;
  const { summary, history } = await getRatingForTpin(user.tpin);

  // ======================
  // TEACHER VIEW
  // ======================
  if (role === "teacher") {
    const classes = await ClassSession.find({ teacher: user._id }).lean();

    const remainingBalance = classes
      .filter((c) => c.status === "adminConfirmed" && !c.paid)
      .reduce((s, c) => s + c.hours * c.hourlyRate, 0);

    return res.json({
      user,
      role,
      remainingBalance,
      ratingSummary: summary,
      ratingHistory: history,
    });
  }

  // ======================
  // EDITOR VIEW
  // ======================
  if (role === "editor") {
    const uploads = await UploadedVideo.find({
      editor: user._id,
    }).lean();

    const unpaid = uploads.filter(
      (u) => u.status === "adminApproved" && u.paid === false
    );

    const remainingBalance = unpaid.reduce((sum, u) => sum + u.rate, 0);

    return res.json({
      user,
      role,
      totals: {
        totalUploaded: uploads.length,
        totalApproved: uploads.filter((u) => u.status === "adminApproved").length,
      },
      remainingBalance,
      ratingSummary: summary,
      ratingHistory: history,
    });
  }

  // ADMIN VIEWING ADMIN
  return res.json({
    user,
    ratingSummary: summary,
    ratingHistory: history,
  });
});

export default router;
