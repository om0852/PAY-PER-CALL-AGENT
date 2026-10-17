import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Rental from "@/lib/models/Rental";
import Service from "@/lib/models/Service";
import Wallet from "@/lib/models/Wallet";
import Transfer from "@/lib/models/Transfer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const buyer = searchParams.get("buyer");
    const category = searchParams.get("category");

    const query: Record<string, unknown> = {
      active: true,
      expiresAt: { $gt: new Date() },
    };

    if (buyer) {
      query.buyer = buyer.toLowerCase();
    }
    if (category) {
      query.category = category;
    }

    const rentals = await Rental.find(query).sort({ createdAt: -1 }).lean();

    const formatted = rentals.map((r) => ({
      id: r._id.toString(),
      buyer: r.buyer,
      serviceId: r.serviceId ? r.serviceId.toString() : null,
      serviceName: r.serviceName,
      category: r.category,
      seller: r.seller,
      rentalPrice: r.rentalPrice,
      rentalPriceUsdc: (r.rentalPrice / 1e6).toFixed(4),
      quotaTotal: r.quotaTotal,
      quotaUsed: r.quotaUsed,
      remainingQuota: Math.max(0, r.quotaTotal - r.quotaUsed),
      percentUsed: Math.min(100, Math.round((r.quotaUsed / r.quotaTotal) * 100)),
      expiresAt: r.expiresAt,
      active: r.active,
      createdAt: r.createdAt,
    }));

    // Consolidate leases per service to present a clean unified quota pool
    const grouped = new Map<string, (typeof formatted)[0]>();
    for (const r of formatted) {
      const key = r.serviceId || r.serviceName.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { ...r });
      } else {
        const existing = grouped.get(key)!;
        existing.quotaTotal += r.quotaTotal;
        existing.quotaUsed += r.quotaUsed;
        existing.remainingQuota = Math.max(0, existing.quotaTotal - existing.quotaUsed);
        existing.percentUsed = Math.min(
          100,
          Math.round((existing.quotaUsed / existing.quotaTotal) * 100)
        );
        existing.rentalPrice += r.rentalPrice;
        existing.rentalPriceUsdc = (existing.rentalPrice / 1e6).toFixed(4);
        if (new Date(r.expiresAt) > new Date(existing.expiresAt)) {
          existing.expiresAt = r.expiresAt;
        }
      }
    }
    const consolidated = Array.from(grouped.values());

    return NextResponse.json({ rentals: consolidated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      buyer,
      serviceId,
      serviceName: incomingServiceName,
      category: incomingCategory,
      rentalPrice: customPrice,
      rentalQuota: customQuota,
      durationDays = 30,
    } = body;

    if (!buyer) {
      return NextResponse.json({ error: "Buyer address is required" }, { status: 400 });
    }

    const buyerAddress = buyer.toLowerCase();

    // 1. Locate the Service
    let targetService = null;
    if (serviceId) {
      targetService = await Service.findById(serviceId);
    }
    if (!targetService && incomingServiceName) {
      targetService = await Service.findOne({ name: incomingServiceName });
    }
    if (!targetService && incomingCategory) {
      targetService = await Service.findOne({ category: incomingCategory, active: true });
    }

    const serviceName = targetService ? targetService.name : incomingServiceName || "Custom Agent Service";
    const category = targetService ? targetService.category : incomingCategory || "data";
    const sellerAddress = targetService ? targetService.payTo.toLowerCase() : "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
    
    // Price: default to service.rentalPrice or customPrice or 1.00 USDC (1,000,000 units)
    const rentPrice = customPrice !== undefined 
      ? Number(customPrice) 
      : (targetService?.rentalPrice || 1000000);

    // Quota: default to service.rentalQuota or customQuota or 10,000 calls
    const quotaCalls = customQuota !== undefined
      ? Number(customQuota)
      : (targetService?.rentalQuota || 10000);

    // 2. Check Buyer Balance and Atomically Debit
    const buyerWallet = await Wallet.findOneAndUpdate(
      { address: buyerAddress, balance: { $gte: rentPrice } },
      { $inc: { balance: -rentPrice } },
      { returnDocument: "after" }
    );

    if (!buyerWallet) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Rental requires ${(rentPrice / 1e6).toFixed(4)} USDC.`,
        },
        { status: 402 }
      );
    }

    // 3. Atomically Credit Seller
    await Wallet.findOneAndUpdate(
      { address: sellerAddress },
      { $inc: { balance: rentPrice } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // 4. Create Transfer Audit Record
    const txHash = "0x" + crypto.randomBytes(32).toString("hex");
    await Transfer.create({
      txHash,
      from: buyerAddress,
      to: sellerAddress,
      amount: rentPrice,
      network: "base-sepolia:84532",
      authorizationNonce: "0x" + crypto.randomBytes(32).toString("hex"),
      settledAt: new Date(),
    });

    // 5. Create or Top-Up Active Rental Lease
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const matchQuery: Record<string, unknown> = {
      buyer: buyerAddress,
      active: true,
      expiresAt: { $gt: new Date() },
    };
    if (targetService?._id) {
      matchQuery.serviceId = targetService._id;
    } else {
      matchQuery.serviceName = serviceName;
    }

    const existingRental = await Rental.findOne(matchQuery);

    let rental;
    if (existingRental) {
      existingRental.quotaTotal += quotaCalls;
      existingRental.rentalPrice += rentPrice;
      const curExpiry = new Date(existingRental.expiresAt).getTime();
      const baseTime = curExpiry > Date.now() ? curExpiry : Date.now();
      existingRental.expiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000);
      rental = await existingRental.save();
    } else {
      rental = await Rental.create({
        buyer: buyerAddress,
        serviceId: targetService?._id || undefined,
        serviceName,
        category,
        seller: sellerAddress,
        rentalPrice: rentPrice,
        quotaTotal: quotaCalls,
        quotaUsed: 0,
        expiresAt,
        active: true,
      });
    }

    const remaining = Math.max(0, rental.quotaTotal - rental.quotaUsed);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully leased "${serviceName}" for ${(rentPrice / 1e6).toFixed(2)} USDC with ${quotaCalls.toLocaleString()} prepaid calls!`,
        rental: {
          id: rental._id.toString(),
          serviceName,
          category,
          rentalPrice: rental.rentalPrice,
          rentalPriceUsdc: (rental.rentalPrice / 1e6).toFixed(4),
          quotaTotal: rental.quotaTotal,
          quotaUsed: rental.quotaUsed,
          remainingQuota: remaining,
          expiresAt: rental.expiresAt,
          txHash,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
