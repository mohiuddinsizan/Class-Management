// src/models/Tour.js
import mongoose from "mongoose";

const tourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // date range
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // multiple participants (admins/teachers/editors — you can restrict if you want)
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // budgets
    budgetGiven: { type: Number, required: true, min: 0 },
    budgetCompleted: { type: Number, default: 0, min: 0 }, // editable later

    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Tour = mongoose.model("Tour", tourSchema);
