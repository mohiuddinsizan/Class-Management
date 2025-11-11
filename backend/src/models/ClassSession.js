import mongoose from "mongoose";

const classSessionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  teacherTpin: { type: String, required: true },  // snapshot
  teacherName: { type: String, required: true },  // snapshot
  hours: { type: Number, default: 1.5, min: 0 },
  hourlyRate: { type: Number, default: 600, min: 0 }, // admin-only field
  status: { type: String, enum: ["pending", "teacherCompleted", "adminConfirmed"], default: "pending" },
  paid: { type: Boolean, default: false },
  completedAt: { type: Date },
  confirmedAt: { type: Date },
  paidAt: { type: Date }
}, { timestamps: true });

export const ClassSession = mongoose.model("ClassSession", classSessionSchema);
