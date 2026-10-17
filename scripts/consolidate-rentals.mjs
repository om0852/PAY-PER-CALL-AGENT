import mongoose from "mongoose";
import fs from "fs";

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  const match = envContent.match(/MONGODB_URI=(.*)/);
  if (match) MONGODB_URI = match[1].trim();
}

async function consolidate() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const rentalsColl = db.collection("rentals");

  const allRentals = await rentalsColl.find({}).toArray();
  console.log("Total rental records:", allRentals.length);

  for (const r of allRentals) {
    console.log(`- ID: ${r._id}, Name: ${r.serviceName}, QuotaTotal: ${r.quotaTotal}, QuotaUsed: ${r.quotaUsed}, Remaining: ${r.quotaTotal - r.quotaUsed}`);
  }

  // Find duplicates for buyer and serviceName
  const grouped = {};
  for (const r of allRentals) {
    const key = `${r.buyer}_${r.serviceName}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  for (const [key, items] of Object.entries(grouped)) {
    if (items.length > 1) {
      console.log(`Found ${items.length} duplicate rentals for ${key}`);
      // Find the one that has quotaUsed > 0 or oldest
      const usedItem = items.find((i) => i.quotaUsed > 0) || items[0];
      const otherItems = items.filter((i) => i._id.toString() !== usedItem._id.toString());

      // If other items have 0 used, we can delete the redundant duplicate
      for (const other of otherItems) {
        if (other.quotaUsed === 0) {
          console.log(`Deleting redundant unused duplicate ${other._id} for ${usedItem.serviceName}`);
          await rentalsColl.deleteOne({ _id: other._id });
        } else {
          // merge quotaUsed
          console.log(`Merging quota from ${other._id}`);
          await rentalsColl.updateOne(
            { _id: usedItem._id },
            { $inc: { quotaUsed: other.quotaUsed } }
          );
          await rentalsColl.deleteOne({ _id: other._id });
        }
      }
    }
  }

  // Set Books Scraper Pro to 10000 total, 2 used, 9998 remaining
  await rentalsColl.updateOne(
    { serviceName: "Books Scraper Pro" },
    { $set: { quotaTotal: 10000, quotaUsed: 2, rentalPrice: 1000000 } }
  );

  const remaining = await rentalsColl.find({}).toArray();
  console.log("\nConsolidated rentals in DB:");
  for (const r of remaining) {
    console.log(`- ID: ${r._id}, Name: ${r.serviceName}, QuotaTotal: ${r.quotaTotal}, QuotaUsed: ${r.quotaUsed}, Remaining: ${r.quotaTotal - r.quotaUsed}`);
  }

  await mongoose.disconnect();
  console.log("Done");
}

consolidate().catch(console.error);
