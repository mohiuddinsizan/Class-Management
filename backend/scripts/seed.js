import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { User } from "../src/models/User.js";

async function main() {
  await connectDB(process.env.MONGO_URI);

  const tpin = "447";
  const password = "87654321";
  const name = "Main Admin";

  let admin = await User.findOne({ tpin });
  if (!admin) {
    admin = new User({ tpin, name, role: "admin", passwordHash: "tmp" });
    await admin.setPassword(password);
    await admin.save();
    console.log("✅ Seeded main admin:", { tpin, password });
  } else {
    console.log("ℹ️ Main admin already exists:", tpin);
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
