import express from "express";
import FreeDay from "../models/FreeDay.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* ------------ Asia/Dhaka helpers ------------ */
// Convert 'YYYY-MM-DD' (local BD) to a UTC Date that points to BD midnight.
function bdLocalMidnightUTC(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  // Asia/Dhaka is UTC+6: local 00:00 -> UTC -06:00 previous day 18:00
  return new Date(Date.UTC(y, m - 1, d, -6, 0, 0, 0));
}
function todayBdLocalMidnightUTC() {
  const now = new Date();
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  return bdLocalMidnightUTC(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}
function validWindow(fromHour, toHour) {
  const f = Number(fromHour);
  const t = Number(toHour);
  return Number.isInteger(f) && Number.isInteger(t) && f >= 0 && t <= 24 && f < t;
}

/**
 * POST /api/free-days
 * body: { date:'YYYY-MM-DD', fromHour:int, toHour:int }
 * - Single day only (per your request)
 * - Different windows on the same day are allowed
 * - Posting the exact same window twice returns 200 and the existing row (no error)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { date, fromHour, toHour } = req.body || {};
    if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    if (!validWindow(fromHour, toHour)) return res.status(400).json({ error: "Invalid time window" });

    const dateLocalUTC = bdLocalMidnightUTC(String(date));
    if (isNaN(dateLocalUTC.valueOf())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // no past
    const todayUTC = todayBdLocalMidnightUTC();
    if (dateLocalUTC < todayUTC) {
      return res.status(400).json({ error: "Cannot add past dates" });
    }

    const query = {
      user: req.user.id,
      dateLocalUTC,
      fromHour: Number(fromHour),
      toHour: Number(toHour),
    };

    // Upsert so exact duplicates don't error; on duplicate we just return the existing doc.
    const update = {
      $setOnInsert: {
        ...query,
        expiresAt: new Date(dateLocalUTC.getTime() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    };

    const doc = await FreeDay.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).populate("user", "name role");

    // Tell caller whether it was newly created or already existed
    res.json({ ok: true, item: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/free-days
 * - Admin sees all future days
 * - Non-admin sees only their own
 */
router.get("/", auth, async (req, res) => {
  try {
    const todayUTC = todayBdLocalMidnightUTC();
    const filter = { dateLocalUTC: { $gte: todayUTC } };
    if (req.user.role !== "admin") filter.user = req.user.id;

    const items = await FreeDay.find(filter)
      .populate("user", "name role")
      .sort({ dateLocalUTC: 1, fromHour: 1, "user.name": 1 });

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/free-days/:id
 * - Admin can delete any
 * - Others can delete only their own
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const doc = await FreeDay.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "admin" && String(doc.user) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
