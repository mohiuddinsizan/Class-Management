// routes/upload.routes.js

import { Router } from "express";
import { auth, isAdmin } from "../middleware/auth.js";
import { ClassSession } from "../models/ClassSession.js";
import { UploadedVideo } from "../models/UploadedVideo.js";

const router = Router();

/**
 * Local middleware: allow only editor or admin.
 * (You can move this into auth.js if you want it reused.)
 */
function isEditorOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  if (req.user.role === "admin" || req.user.role === "editor") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden" });
}

/* ---------------------- SYNC / AUTO-CREATE TASKS -------------------- */
/**
 * Optional helper (admin-only)
 * Create UploadedVideo docs for all adminConfirmed sessions
 * that don't yet have an upload-task.
 *
 * You don't HAVE to call this if you create UploadedVideo in
 * the /:id/confirm route of class.routes, but it's
 * nice as a fixer if something gets out of sync.
 */
router.post("/sync-from-sessions", auth, isAdmin, async (_req, res, next) => {
  try {
    const confirmedSessions = await ClassSession
      .find({ status: "adminConfirmed" })
      .select("_id");
    const existingTasks = await UploadedVideo
      .find({})
      .select("classSession");

    const existingSet = new Set(
      existingTasks.map((t) => String(t.classSession))
    );
    const toCreate = confirmedSessions.filter(
      (s) => !existingSet.has(String(s._id))
    );

    if (!toCreate.length) {
      return res.json({ created: 0 });
    }

    await UploadedVideo.insertMany(
      toCreate.map((s) => ({
        classSession: s._id,
        uploaded: false,
        // editor left undefined; will be set when editor marks uploaded
      }))
    );

    res.json({ created: toCreate.length });
  } catch (e) {
    next(e);
  }
});

/* --------------------------- PENDING UPLOADS ------------------------ */
/**
 * GET /upload/pending
 * - Admin: see all not-yet-uploaded tasks
 * - Editor: see all not-yet-uploaded tasks as well
 *   (if you later add per-editor assignment, you can filter by editor here)
 */
router.get("/pending", auth, isEditorOrAdmin, async (req, res, next) => {
  try {
    const filter = { uploaded: false };

    const rows = await UploadedVideo.find(filter)
      .populate({
        path: "classSession",
        populate: [
          { path: "course", select: "name" },
          { path: "teacher", select: "name tpin" },
        ],
      })
      .lean();

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

/* --------------------------- UPLOADED LIST -------------------------- */
/**
 * GET /upload/uploaded
 * - Admin: see all uploaded
 * - Editor: see all uploaded as well (optional, can be limited to admin)
 */
router.get("/uploaded", auth, isEditorOrAdmin, async (req, res, next) => {
  try {
    const filter = { uploaded: true };

    const rows = await UploadedVideo.find(filter)
      .populate({
        path: "classSession",
        populate: [
          { path: "course", select: "name" },
          { path: "teacher", select: "name tpin" },
        ],
      })
      .lean();

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

/* ---------------------- MARK AS UPLOADED / NOT ---------------------- */
/**
 * PATCH /upload/:id/uploaded
 * Editor or admin confirms that the video has been uploaded.
 * Optionally accepts { videoUrl } in body.
 */
router.patch("/:id/uploaded", auth, isEditorOrAdmin, async (req, res, next) => {
  try {
    const { videoUrl } = req.body || {};
    const task = await UploadedVideo.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });

    task.uploaded = true;
    if (videoUrl) task.videoUrl = String(videoUrl).trim();
    task.uploadedAt = new Date();

    // If an editor is doing this, record them as the editor
    if (req.user.role === "editor") {
      task.editor = req.user._id;
    }

    await task.save();

    res.json(task);
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /upload/:id/unuploaded
 * Allow admin or editor to revert if there was a mistake.
 */
router.patch("/:id/unuploaded", auth, isEditorOrAdmin, async (req, res, next) => {
  try {
    const task = await UploadedVideo.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });

    task.uploaded = false;
    task.uploadedAt = undefined;
    task.videoUrl = undefined;
    await task.save();

    res.json(task);
  } catch (e) {
    next(e);
  }
});

/* ----------------------------- CLEANUP ------------------------------ */
/**
 * (Optional) Admin-only delete of upload tasks.
 * This does NOT delete the underlying ClassSession.
 */
router.delete("/:id", auth, isAdmin, async (req, res, next) => {
  try {
    const task = await UploadedVideo.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });

    await task.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
