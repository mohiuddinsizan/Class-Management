// backend/src/models/FreeDay.js
import mongoose from "mongoose";

/**
 * We store:
 * - dateLocalUTC: Date pointing to *midnight in Asia/Dhaka*, represented in UTC
 * - fromHour, toHour: integers [0..24) in local Asia/Dhaka hours
 * - expiresAt: Date = dateLocalUTC + 24h (for TTL auto-clean after the day passes)
 */
const freeDaySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateLocalUTC: { type: Date, required: true }, // midnight BD time, in UTC
    fromHour: { type: Number, min: 0, max: 23, required: true },
    toHour: { type: Number, min: 1, max: 24, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Prevent duplicates for same window on same date per user
// unique on user + date + window
freeDaySchema.index({ user: 1, dateLocalUTC: 1, fromHour: 1, toHour: 1 }, { unique: true });


// TTL: automatically delete the record after the local day is over
freeDaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("FreeDay", freeDaySchema);
