// src/routes/account.routes.js
import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

// PATCH /api/account/password  { currentPassword, newPassword, confirmPassword }
router.patch("/password", auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Require current password
    const ok = await user.validatePassword(currentPassword || "");
    if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

    await user.setPassword(newPassword);
    await user.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
