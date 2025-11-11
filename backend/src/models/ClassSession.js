import mongoose from "mongoose";

const classSessionSchema = new mongoose.Schema({
  // Human-entered session name, e.g. "Batch A – Week 3" or "Section 2"
  name: { type: String, required: true, trim: true },

  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // snapshots
  teacherTpin: { type: String, required: true },
  teacherName: { type: String, required: true },

  hours: { type: Number, default: 1.5, min: 0 },
  hourlyRate: { type: Number, default: 600, min: 0 }, // admin-only field
  status: { type: String, enum: ["pending", "teacherCompleted", "adminConfirmed"], default: "pending" },
  paid: { type: Boolean, default: false },
  completedAt: { type: Date },
  confirmedAt: { type: Date },
  paidAt: { type: Date }
}, { timestamps: true });

// Ensure names are unique *within the same course*
classSessionSchema.index({ course: 1, name: 1 }, { unique: true });

export const ClassSession = mongoose.model("ClassSession", classSessionSchema);
