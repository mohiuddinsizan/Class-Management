// src/index.js - Local development server
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./db.js";

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
