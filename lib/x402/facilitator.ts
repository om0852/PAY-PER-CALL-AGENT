import crypto from "crypto";
import { connectToDatabase } from "../mongodb";
import Wallet from "../models/Wallet";
import Authorization from "../models/Authorization";
import Transfer from "../models/Transfer";
import { PaymentAuthorization, VerifyRequest, VerifyResponse, SettleRequest, SettleResponse } from "./types";
import { verifyEIP3009Signature, parseHexSignature } from "./eip3009";

export async function verifyPayment(req: VerifyRequest): Promise<VerifyResponse> {
  await connectToDatabase();

  const auth = req.authorization;
  if (!auth || !auth.from || !auth.to || !auth.nonce || !req.signature) {
    return { valid: false, error: "Missing required authorization or signature fields" };
  }

  // 1. Check buyer wallet exists and has sufficient balance
  const buyer = await Wallet.findOne({ address: auth.from.toLowerCase() });
  if (!buyer) {
    return { valid: false, error: `Buyer wallet ${auth.from} does not exist in registry` };
  }

  if (buyer.balance < auth.value) {
    return {
      valid: false,
      error: `Insufficient balance: buyer has ${buyer.balance} units, payment requires ${auth.value} units`,
    };
  }

  // 2. Cryptographic signature check (EIP-712 / EIP-3009)
  const sigCheck = await verifyEIP3009Signature(auth, req.signature);
  if (!sigCheck.valid) {
    return { valid: false, error: `Invalid cryptographic signature: ${sigCheck.error}` };
  }

  // 3. Replay protection: atomically record authorization
  try {
    await Authorization.create({
      from: auth.from.toLowerCase(),
      to: auth.to.toLowerCase(),
      value: auth.value,
      validAfter: auth.validAfter,
      validBefore: auth.validBefore,
      nonce: auth.nonce,
      status: "verified",
      createdAt: new Date(),
    });
  } catch (err: unknown) {
    // Unique compound index (from, nonce) failed -> replay attack
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      return { valid: false, error: `Replay attack detected: nonce ${auth.nonce} has already been used by ${auth.from}` };
    }
    return { valid: false, error: `Authorization recording failed: ${String(err)}` };
  }

  return { valid: true };
}

export async function settlePayment(req: SettleRequest): Promise<SettleResponse> {
  await connectToDatabase();

  const auth = req.authorization;
  if (!auth || !auth.from || !auth.to || !auth.nonce) {
    return { settled: false, error: "Missing authorization fields" };
  }

  const from = auth.from.toLowerCase();
  const to = auth.to.toLowerCase();
  const nonce = auth.nonce;

  // 1. Check that authorization exists and is in 'verified' status
  const existingAuth = await Authorization.findOne({ from, nonce });
  if (!existingAuth) {
    return { settled: false, error: "Authorization not found. Verification must precede settlement." };
  }

  if (existingAuth.status === "settled") {
    return { settled: false, error: "Authorization has already been settled" };
  }

  // 2. Perform atomic balance transfer
  const buyer = await Wallet.findOneAndUpdate(
    { address: from, balance: { $gte: auth.value } },
    { $inc: { balance: -auth.value } },
    { returnDocument: "after" }
  );

  if (!buyer) {
    return { settled: false, error: "Buyer has insufficient balance at settlement time" };
  }

  await Wallet.findOneAndUpdate(
    { address: to },
    { $inc: { balance: auth.value } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // 3. Mark authorization as settled
  existingAuth.status = "settled";
  await existingAuth.save();

  // 4. Generate simulated transaction hash and record transfer
  const fakeTxHash = "0x" + crypto.randomBytes(32).toString("hex");
  const parsedSig = req.signature ? parseHexSignature(req.signature) : undefined;

  await Transfer.create({
    txHash: fakeTxHash,
    from,
    to,
    amount: auth.value,
    network: req.network || "simulated:84532",
    authorizationNonce: nonce,
    signature: parsedSig,
    settledAt: new Date(),
  });

  return { settled: true, txHash: fakeTxHash };
}
