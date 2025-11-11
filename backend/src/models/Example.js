import mongoose from "mongoose";
const exampleSchema = new mongoose.Schema(
  { title: { type: String, required: true } },
  { timestamps: true }
);
export const Example = mongoose.model("Example", exampleSchema);
