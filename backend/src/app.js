// src/app.js
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
// Expose BOTH "/" and "/health" so health checks can hit either path.
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
import ratingRoutes from "./routes/rating.routes.js";   


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/free-days", freeDayRoutes);
app.use("/api/ratings", ratingRoutes);  

/* --------------------------- Error Middleware --------------------------- */
app.use((err, _req, res, _next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: "Server error" });
});

/* --------------------------- DB Connection (Lambda) --------------------------- */
// For Lambda, we connect once and reuse the connection across invocations
let isConnected = false;

export async function ensureDBConnection() {
  if (isConnected) {
    console.log("♻️  Reusing existing DB connection");
    return;
  }
  
  if (!process.env.MONGO_URI) {
    console.warn("⚠️  MONGO_URI is not set; API will run without DB");
    return;
  }
  
  try {
    await connectDB(process.env.MONGO_URI);
    isConnected = true;
    console.log("✅ Mongo connected");
  } catch (err) {
    console.error("❌ Mongo connection failed:", err?.message || err);
    throw err;
  }
}

export default app;
