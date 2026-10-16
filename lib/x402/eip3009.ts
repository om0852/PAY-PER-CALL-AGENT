import crypto from "crypto";
import { recoverTypedDataAddress, parseSignature, Hex } from "viem";
import { PaymentAuthorization } from "./types";

export const EIP712_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 84532, // Base Sepolia / simulated
  verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Hex,
};

export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function generateNonce(): `0x${string}` {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

export function parseHexSignature(sig: string) {
  try {
    const parsed = parseSignature(sig as Hex);
    return {
      v: Number(parsed.v ?? (parsed.yParity === 1 ? 28 : 27)),
      r: parsed.r,
      s: parsed.s,
    };
  } catch {
    return {
      v: 27,
      r: "0x" + "0".repeat(64),
      s: "0x" + "0".repeat(64),
    };
  }
}

export async function verifyEIP3009Signature(
  auth: PaymentAuthorization,
  signature: string
): Promise<{ valid: boolean; recoveredAddress?: string; error?: string }> {
  try {
    const recovered = await recoverTypedDataAddress({
      domain: EIP712_DOMAIN,
      types: EIP3009_TYPES,
      primaryType: "TransferWithAuthorization",
      message: {
        from: auth.from as Hex,
        to: auth.to as Hex,
        value: BigInt(auth.value),
        validAfter: BigInt(auth.validAfter),
        validBefore: BigInt(auth.validBefore),
        nonce: auth.nonce as Hex,
      },
      signature: signature as Hex,
    });

    if (recovered.toLowerCase() === auth.from.toLowerCase()) {
      return { valid: true, recoveredAddress: recovered };
    } else {
      return {
        valid: false,
        recoveredAddress: recovered,
        error: `Recovered signer ${recovered} does not match authorization.from ${auth.from}`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  }
}
