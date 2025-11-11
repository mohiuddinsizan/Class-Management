// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

const app = express();

/* ------------------------------ CORS ------------------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://class-management-rust.vercel.app",
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json());

/* ------------------------------ Health ---------------------------- */
// Expose BOTH "/" and "/health" so Render can hit either path.
app.get("/", (_req, res) => res.status(200).send("ok"));
app.get("/health", (_req, res) => res.status(200).send("ok"));

/* ------------------------------ Routes ---------------------------- */
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import classRoutes from "./routes/class.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import reportRoutes from "./routes/report.routes.js";
import accountRoutes from "./routes/account.routes.js";
import freeDayRoutes from "./routes/freeday.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/free-days", freeDayRoutes);

/* --------------------------- Error Middleware --------------------------- */
app.use((err, _req, res, _next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: "Server error" });
});

/* ---------------------------- Start Server ----------------------------- */
const PORT = process.env.PORT || 5000;

// Start the HTTP server first, so health checks can pass
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API listening on ${PORT}`);
  if (!process.env.MONGO_URI) {
    console.warn("⚠️  MONGO_URI is not set; API will run without DB");
  }
  // Connect to DB asynchronously (don’t block startup)
  connectDB(process.env.MONGO_URI)
    .then(() => console.log("✅ Mongo connected"))
    .catch((err) => {
      console.error("❌ Mongo connection failed:", err?.message || err);
      // DO NOT exit; keep health endpoint up so you can debug
    });
});
