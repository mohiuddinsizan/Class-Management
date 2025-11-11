import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";

const router = Router();

// GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/summary", auth, isAdmin, async (req, res) => {
  const { start, end } = req.query || {};
  const match = { status: "adminConfirmed" };
  if (start || end) {
    match.confirmedAt = {};
    if (start) match.confirmedAt.$gte = new Date(start);
    if (end) match.confirmedAt.$lte = new Date(end);
  }

  const rows = await ClassSession.aggregate([
    { $match: match },
    { $addFields: { amount: { $multiply: ["$hours", "$hourlyRate"] } } },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        totalHours: { $sum: "$hours" },
        totalAmount: { $sum: "$amount" }
      }
    }
  ]);

  const byTeacher = await ClassSession.aggregate([
    { $match: match },
    { $addFields: { amount: { $multiply: ["$hours", "$hourlyRate"] } } },
    { $group: { _id: "$teacher", classes: { $sum: 1 }, hours: { $sum: "$hours" }, amount: { $sum: "$amount" } } }
  ]);

  res.json({ summary: rows[0] || { totalClasses: 0, totalHours: 0, totalAmount: 0 }, byTeacher });
});

export default router;
