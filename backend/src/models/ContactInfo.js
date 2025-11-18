import mongoose from "mongoose";

const contactInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one contact record per user
    },
    phone: { type: String, default: "" }, // main contact number
    bkash: { type: String, default: "" },
    nagad: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ContactInfo = mongoose.model("ContactInfo", contactInfoSchema);
