import { Router } from "express";
import { auth, isAdmin, isTeacherOrAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { Course } from "../models/Course.js";
import { User } from "../models/User.js";

const router = Router();

/* ------------------------------ ASSIGN ------------------------------ */
// Admin only; assignee can be teacher OR admin (admins can teach)
router.post("/assign", auth, isAdmin, async (req, res, next) => {
  try {
    const { courseId, teacherId, name, hours = 1.5, hourlyRate = 600 } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Class name is required" });
    }

    const course = await Course.findById(courseId);
    const teacher = await User.findById(teacherId);
    if (!course) return res.status(400).json({ error: "Invalid course" });
    if (!teacher || !["teacher","admin"].includes(teacher.role)) {
      return res.status(400).json({ error: "Invalid assignee (must be teacher or admin)" });
    }

    const created = await ClassSession.create({
      name: String(name).trim(),
      course: course._id,
      teacher: teacher._id,
      teacherTpin: teacher.tpin,
      teacherName: teacher.name,
      hours,
      hourlyRate,
      status: "pending",
      paid: false,
    });

    res.status(201).json(created);
  } catch (e) {
    // Handle duplicate {course, name} nicely
    if (e?.code === 11000) {
      return res.status(409).json({ error: "A class with this name already exists for this course" });
    }
    next(e);
  }
});

/* ------------------------------ PENDING ----------------------------- */
// Admins see all; teachers see only their own
router.get("/pending", auth, isTeacherOrAdmin, async (req, res, next) => {
  try {
    const filter = { status: "pending" };
    if (req.user.role === "teacher") filter.teacher = req.user.id;

    const rows = await ClassSession.find(filter)
      .populate("course", "name")
      .populate("teacher", "name tpin")
      .lean();

    // rows already include .name (session name)
    res.json(rows);
  } catch (e) { next(e); }
});

/* --------------------------- MARK COMPLETE -------------------------- */
// Teacher can complete only their own; admin can complete any pending
router.patch("/:id/complete", auth, isTeacherOrAdmin, async (req, res, next) => {
  try {
    const cls = await ClassSession.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Not found" });
    if (cls.status !== "pending") return res.status(400).json({ error: "Not pending" });

    const isOwner = String(cls.teacher) === String(req.user.id);
    if (req.user.role === "teacher" && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    cls.status = "teacherCompleted";
    cls.completedAt = new Date();
    await cls.save();
    res.json(cls);
  } catch (e) { next(e); }
});

/* ------------------------- CONFIRMATION QUEUE ----------------------- */
// Admin-only
router.get("/confirmation", auth, isAdmin, async (_req, res, next) => {
  try {
    const rows = await ClassSession.find({ status: "teacherCompleted" })
      .populate("course", "name")
      .populate("teacher", "name tpin")
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch("/:id/confirm", auth, isAdmin, async (req, res, next) => {
  try {
    const cls = await ClassSession.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Not found" });
    if (cls.status !== "teacherCompleted") return res.status(400).json({ error: "Not in confirmation queue" });

    cls.status = "adminConfirmed";
    cls.confirmedAt = new Date();
    await cls.save();
    res.json(cls);
  } catch (e) { next(e); }
});

/* ------------------------------ COMPLETED -------------------------- */
// Admin-only; supports filters: courseId, teacherId, tpin, start, end
router.get("/completed", auth, isAdmin, async (req, res, next) => {
  try {
    const { courseId, teacherId, tpin, start, end } = req.query || {};
    const filter = { status: "adminConfirmed" };
    if (courseId) filter.course = courseId;
    if (teacherId) filter.teacher = teacherId;
    if (tpin) filter.teacherTpin = tpin;

    if (start || end) {
      filter.confirmedAt = {};
      if (start) filter.confirmedAt.$gte = new Date(start);
      if (end) {
        const d = new Date(end);
        d.setHours(23,59,59,999); // include entire end date
        filter.confirmedAt.$lte = d;
      }
    }

    const rows = await ClassSession.find(filter)
      .populate("course", "name")
      .populate("teacher", "name tpin")
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

/* ------------------------------- UNPAID ----------------------------- */
// Admin-only unpaid list (confirmed but not paid)
router.get("/unpaid", auth, isAdmin, async (_req, res, next) => {
  try {
    const rows = await ClassSession.find({
      status: "adminConfirmed",
      paid: { $ne: true }
    })
      .populate("course", "name")
      .populate("teacher", "name tpin")
      .lean();
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch("/:id/paid", auth, isAdmin, async (req, res, next) => {
  try {
    const cls = await ClassSession.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Not found" });
    cls.paid = true;
    cls.paidAt = new Date();
    await cls.save();
    res.json(cls);
  } catch (e) { next(e); }
});

// (Optional) keep the toggle endpoint for other admin views if needed,
// but the current Unpaid page no longer calls it.
router.patch("/:id/unpaid", auth, isAdmin, async (req, res, next) => {
  try {
    const cls = await ClassSession.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Not found" });
    cls.paid = false;
    cls.paidAt = undefined;
    await cls.save();
    res.json(cls);
  } catch (e) { next(e); }
});

// Bulk confirm all unpaid -> paid
router.post("/unpaid/confirm-all", auth, isAdmin, async (_req, res, next) => {
  try {
    const result = await ClassSession.updateMany(
      { status: "adminConfirmed", paid: false },
      { $set: { paid: true, paidAt: new Date() } }
    );
    res.json({ modified: result.modifiedCount });
  } catch (e) { next(e); }
});

/* -------------------------- DELETE PENDING -------------------------- */
// Admin can delete only PENDING sessions
router.delete("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const cls = await ClassSession.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: "Not found" });
    if (cls.status !== "pending") return res.status(400).json({ error: "Only pending can be deleted" });
    await cls.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
