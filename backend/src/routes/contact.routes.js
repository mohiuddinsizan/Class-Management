import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ContactInfo } from "../models/ContactInfo.js";

const router = Router();

/**
 * GET /api/contacts
 * List contact info for ALL active users.
 * Everyone (logged in) can see this.
 */
router.get("/", auth, async (req, res, next) => {
  try {
    // all active users
    const users = await User.find({ isActive: true })
      .select("name tpin role")
      .lean();

    // contact records
    const contacts = await ContactInfo.find({}).lean();
    const contactMap = new Map(
      contacts.map((c) => [String(c.user), c])
    );

    const result = users.map((u) => {
      const c = contactMap.get(String(u._id));
      return {
        userId: String(u._id),
        name: u.name,
        tpin: u.tpin,
        role: u.role,
        phone: c?.phone || "",
        bkash: c?.bkash || "",
        nagad: c?.nagad || "",
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/contacts/me
 * Get current user's contact info (merged with user data).
 */
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name tpin role isActive")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const contact = await ContactInfo.findOne({ user: user._id }).lean();

    res.json({
      userId: String(user._id),
      name: user.name,
      tpin: user.tpin,
      role: user.role,
      phone: contact?.phone || "",
      bkash: contact?.bkash || "",
      nagad: contact?.nagad || "",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/contacts/me
 * Create or update current user's contact info.
 * Only the logged-in user can change their own numbers.
 */
router.put("/me", auth, async (req, res, next) => {
  try {
    const { phone = "", bkash = "", nagad = "" } = req.body || {};

    const user = await User.findById(req.user.id)
      .select("name tpin role isActive")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // simple cleaning
    const clean = (s) => (typeof s === "string" ? s.trim() : "");
    const payload = {
      phone: clean(phone),
      bkash: clean(bkash),
      nagad: clean(nagad),
    };

    let doc = await ContactInfo.findOne({ user: user._id });

    if (!doc) {
      doc = await ContactInfo.create({
        user: user._id,
        ...payload,
      });
    } else {
      doc.phone = payload.phone;
      doc.bkash = payload.bkash;
      doc.nagad = payload.nagad;
      await doc.save();
    }

    res.json({
      userId: String(user._id),
      name: user.name,
      tpin: user.tpin,
      role: user.role,
      phone: doc.phone,
      bkash: doc.bkash,
      nagad: doc.nagad,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
