import { Router } from "express";
import { Example } from "../models/Example.js";

const router = Router();

// health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// tiny demo CRUD
router.get("/examples", async (_req, res) => {
  const items = await Example.find().lean();
  res.json(items);
});

router.post("/examples", async (req, res, next) => {
  try {
    const created = await Example.create({ title: req.body.title });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

export default router;
