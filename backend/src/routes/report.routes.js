// routes/reports.routes.js

import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { UploadedVideo } from "../models/UploadedVideo.js";

const router = Router();

/* ---------------------- TEACHER CLASS SUMMARY ---------------------- */
// GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/summary", auth, isAdmin, async (req, res, next) => {
  try {
    const { start, end } = req.query || {};
    const match = { status: "adminConfirmed" };

    if (start || end) {
      match.confirmedAt = {};
      if (start) match.confirmedAt.$gte = new Date(start);
      if (end) {
        const d = new Date(end);
        d.setHours(23, 59, 59, 999); // include entire end date
        match.confirmedAt.$lte = d;
      }
    }

    const rows = await ClassSession.aggregate([
      { $match: match },
      { $addFields: { amount: { $multiply: ["$hours", "$hourlyRate"] } } },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalHours: { $sum: "$hours" },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const byTeacher = await ClassSession.aggregate([
      { $match: match },
      { $addFields: { amount: { $multiply: ["$hours", "$hourlyRate"] } } },
      {
        $group: {
          _id: "$teacher",
          classes: { $sum: 1 },
          hours: { $sum: "$hours" },
          amount: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      summary: rows[0] || { totalClasses: 0, totalHours: 0, totalAmount: 0 },
      byTeacher,
    });
  } catch (e) {
    next(e);
  }
});

/* -------------------- UPLOADED VIDEOS (EDITORS) -------------------- */
// GET /api/reports/uploaded-videos?start=YYYY-MM-DD&end=YYYY-MM-DD
// Report of videos that HAVE been uploaded by editors
router.get("/uploaded-videos", auth, isAdmin, async (req, res, next) => {
  try {
    const { start, end } = req.query || {};
    const match = { uploaded: true }; // ✅ we care about uploaded ones

    // filter by uploadedAt range (when video was marked uploaded)
    if (start || end) {
      match.uploadedAt = {};
      if (start) match.uploadedAt.$gte = new Date(start);
      if (end) {
        const d = new Date(end);
        d.setHours(23, 59, 59, 999);
        match.uploadedAt.$lte = d;
      }
    }

    // Overall summary
    const rows = await UploadedVideo.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
        },
      },
    ]);

    // Breakdown by editor
    const byEditor = await UploadedVideo.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$editor",
          videos: { $sum: 1 },
        },
      },
    ]);

    res.json({
      summary: rows[0] || { totalVideos: 0 },
      byEditor,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
