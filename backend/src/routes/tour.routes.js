// src/routes/tour.routes.js
import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { Tour } from "../models/Tour.js";

const router = Router();

/* ------------ LIST + FILTERS ------------
  Query params:
    - userId=...           (single id; will match if included in tour.users)
    - start=YYYY-MM-DD     (include tours with endDate >= start)
    - end=YYYY-MM-DD       (include tours with startDate <= end)
    - minBudget=number     (budgetGiven >= minBudget)
    - maxBudget=number     (budgetGiven <= maxBudget)
*/
router.get("/", auth, isAdmin, async (req, res, next) => {
  try {
    const { userId, start, end, minBudget, maxBudget } = req.query || {};
    const q = {};

    if (userId) q.users = userId;

    if (start || end) {
      q.$and = [];
      if (start) q.$and.push({ endDate: { $gte: new Date(start) } });
      if (end) q.$and.push({ startDate: { $lte: new Date(end) } });
      if (q.$and.length === 0) delete q.$and;
    }

    if (minBudget || maxBudget) {
      q.budgetGiven = {};
      if (minBudget) q.budgetGiven.$gte = Number(minBudget);
      if (maxBudget) q.budgetGiven.$lte = Number(maxBudget);
      if (Object.keys(q.budgetGiven).length === 0) delete q.budgetGiven;
    }

    const tours = await Tour.find(q)
      .sort({ startDate: -1, createdAt: -1 })
      .populate("users", "name tpin role")
      .lean();

    res.json(tours);
  } catch (e) {
    next(e);
  }
});

/* ---------------- CREATE ---------------- */
router.post("/", auth, isAdmin, async (req, res, next) => {
  try {
    const { name, startDate, endDate, users = [], budgetGiven, budgetCompleted = 0, notes = "" } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!startDate || !endDate) return res.status(400).json({ error: "Start and End date are required" });

    const created = await Tour.create({
      name: String(name).trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      users,
      budgetGiven: Number(budgetGiven || 0),
      budgetCompleted: Number(budgetCompleted || 0),
      notes: String(notes || ""),
      isActive: true,
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/* ---------------- UPDATE ---------------- */
// Use this for editing (including budgetCompleted after tour finishes)
router.patch("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const update = {};
    const fields = ["name", "startDate", "endDate", "users", "budgetGiven", "budgetCompleted", "notes", "isActive"];
    for (const k of fields) {
      if (req.body[k] !== undefined) {
        if (k === "startDate" || k === "endDate") update[k] = new Date(req.body[k]);
        else if (k === "budgetGiven" || k === "budgetCompleted") update[k] = Number(req.body[k] || 0);
        else update[k] = req.body[k];
      }
    }

    const tour = await Tour.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("users", "name tpin role");
    if (!tour) return res.status(404).json({ error: "Not found" });
    res.json(tour);
  } catch (e) {
    next(e);
  }
});

/* ---------------- DELETE ---------------- */
router.delete("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
