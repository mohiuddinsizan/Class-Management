import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const CourseSchema = new Schema({
  name: { type: String, required: true },
  numberOfClasses: { type: Number, default: 0 },
  subjects: [{ type: String }],
  // NEW: support multiple people (teachers or admins) assigned to the course
  assignedTeachers: [{ type: Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ["active","archived"], default: "active" }
}, { timestamps: true });

export const Course = mongoose.model("Course", CourseSchema);
