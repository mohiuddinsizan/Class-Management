import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive)
      return res.status(401).json({ error: "Unauthorized" });

    req.user = {
      id: user._id,
      role: user.role,
      tpin: user.tpin,
      name: user.name,
    };

    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// ---------------- ROLE MIDDLEWARES ----------------

// Only Admin
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Only Teacher
export const isTeacher = (req, res, next) => {
  if (req.user?.role !== "teacher")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Only Editor
export const isEditor = (req, res, next) => {
  if (req.user?.role !== "editor")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Teacher OR Admin (your original middleware)
export const isTeacherOrAdmin = (req, res, next) => {
  if (!["teacher", "admin"].includes(req.user?.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Teacher OR Editor
export const isTeacherOrEditor = (req, res, next) => {
  if (!["teacher", "editor"].includes(req.user?.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Admin OR Editor
export const isAdminOrEditor = (req, res, next) => {
  if (!["admin", "editor"].includes(req.user?.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Teacher OR Editor OR Admin (everyone)
export const isTeacherEditorOrAdmin = (req, res, next) => {
  if (!["teacher", "editor", "admin"].includes(req.user?.role))
    return res.status(403).json({ error: "Forbidden" });
  next();
};
