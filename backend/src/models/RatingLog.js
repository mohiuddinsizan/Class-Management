import mongoose from "mongoose";

const ratingLogSchema = new mongoose.Schema(
  {
    tpin: {
      type: String,
      required: true,
      index: true,          // join key to User
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",          // admin who wrote it
      required: true,
    },
  },
  { timestamps: true }
);

// fast query: all notes for a user, newest first
ratingLogSchema.index({ tpin: 1, createdAt: -1 });

export const RatingLog = mongoose.model("RatingLog", ratingLogSchema);
