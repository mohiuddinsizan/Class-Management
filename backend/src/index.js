// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import classRoutes from "./routes/class.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import reportRoutes from "./routes/report.routes.js";
import accountRoutes from "./routes/account.routes.js";
import freeDayRoutes from "./routes/freeday.routes.js";


const app = express();

/* ------------------------------ CORS Setup ------------------------------ */
// Allowed origins: your Vercel frontend + localhost for dev
const allowedOrigins = [
  "http://localhost:5173",
  "https://class-management-rust.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman/curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

/* ------------------------------- Routes -------------------------------- */
app.get("/health", (_req, res) => res.send("ok")); // for Render uptime checks

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

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀 API running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
