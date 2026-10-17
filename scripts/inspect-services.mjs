import mongoose from "mongoose";
import fs from "fs";

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && fs.existsSync(".env.local")) {
  const match = fs.readFileSync(".env.local", "utf-8").match(/MONGODB_URI=(.*)/);
  if (match) MONGODB_URI = match[1].trim();
}

async function inspect() {
  await mongoose.connect(MONGODB_URI);
  const services = await mongoose.connection.db.collection("services").find({}).toArray();
  console.log(`Total services: ${services.length}\n`);
  for (const s of services) {
    console.log(`ID: ${s._id} | Name: "${s.name}" | Endpoint: "${s.endpoint}" | Category: ${s.category} | Price: ${s.price}`);
  }
  await mongoose.disconnect();
}

inspect().catch(console.error);
