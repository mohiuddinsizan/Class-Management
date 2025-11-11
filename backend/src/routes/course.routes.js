import { Router } from "express";
import { Course } from "../models/Course.js";
import { User } from "../models/User.js";
import { auth, isAdmin } from "../middleware/auth.js";

const router = Router();

/* ----------------------------- helpers ----------------------------- */
async function normalizeAssignees({ assignedTeachers, assignedTeacher }) {
  let ids = [];
  if (Array.isArray(assignedTeachers)) ids = assignedTeachers;
  else if (assignedTeachers) ids = [assignedTeachers];
  if (assignedTeacher) ids.push(assignedTeacher); // legacy support

  ids = [...new Set(ids.filter(Boolean))];
  if (ids.length === 0) return [];

  const users = await User.find({ _id: { $in: ids } }, "_id role").lean();
  const valid = users.filter(u => ["teacher", "admin"].includes(u.role)).map(u => String(u._id));
  return ids.filter(x => valid.includes(String(x)));
}

/* ------------------------------ list ------------------------------- */
// Admin-only; include legacy docs with no status as "active"
router.get("/", auth, isAdmin, async (req, res, next) => {
  try {
    const view = req.query.status === "archived" ? "archived" : "active";
    const q = view === "archived"
      ? { status: "archived" }
      : { $or: [{ status: "active" }, { status: { $exists: false } }] };

    const courses = await Course.find(q)
      .populate("assignedTeachers", "name tpin role")
      .lean();

    res.json(courses);
  } catch (e) { next(e); }
});

/* ------------------------------ create ----------------------------- */
router.post("/", auth, isAdmin, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name is required" });

    const numberOfClasses = Number(req.body.numberOfClasses ?? 0);
    const subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    const assignees = await normalizeAssignees(req.body);

    const created = await Course.create({
      name,
      numberOfClasses,
      subjects,
      assignedTeachers: assignees,
      status: "active",
    });

    res.status(201).json({ _id: created._id, name: created.name });
  } catch (e) { next(e); }
});

/* ------------------------------ update ----------------------------- */
router.patch("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.numberOfClasses !== undefined) update.numberOfClasses = Number(req.body.numberOfClasses);
    if (req.body.subjects !== undefined) update.subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.assignedTeachers !== undefined || req.body.assignedTeacher !== undefined) {
      update.assignedTeachers = await normalizeAssignees(req.body);
    }

    const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("assignedTeachers", "name tpin role");
    if (!course) return res.status(404).json({ error: "Not found" });

    res.json(course);
  } catch (e) { next(e); }
});

/* --------------------------- archive toggles --------------------------- */
router.patch("/:id/archive", auth, isAdmin, async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { status: "archived" }, { new: true });
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json(course);
  } catch (e) { next(e); }
});

router.patch("/:id/unarchive", auth, isAdmin, async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json(course);
  } catch (e) { next(e); }
});

/* ------------------------------- delete ------------------------------ */
router.delete("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
