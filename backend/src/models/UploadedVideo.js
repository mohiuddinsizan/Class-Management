// models/UploadedVideo.js
import mongoose from "mongoose";

const uploadedVideoSchema = new mongoose.Schema(
  {
    classSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSession",
      required: true,
      unique: true, // one upload record per class session
    },

    // Make editor OPTIONAL – we'll fill it when the editor actually uploads
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: true,   // ❌ REMOVE THIS
    },

    uploaded: {
      type: Boolean,
      default: false,
    },

    videoUrl: {
      type: String,
      default: null,
    },

    uploadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Make sure you removed the duplicate index if it was there
// uploadedVideoSchema.index({ classSession: 1 }, { unique: true });

export const UploadedVideo = mongoose.model("UploadedVideo", uploadedVideoSchema);
