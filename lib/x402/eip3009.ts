import crypto from "crypto";
import { recoverTypedDataAddress, parseSignature, Hex, createPublicClient, createWalletClient, http, fallback } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { PaymentAuthorization } from "./types";

export const EIP712_DOMAIN = {
  name: "USDC",
  version: "2",
  chainId: 84532, // Base Sepolia
  verifyingContract: (process.env.USDC_CONTRACT_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Hex,
};

// Fallback domain for legacy / simulated clients using 'USD Coin'
export const EIP712_DOMAIN_FALLBACK = {
  ...EIP712_DOMAIN,
  name: "USD Coin",
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

export const USDC_ABI = [
  {
    name: "receiveWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "transferWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "authorizationState",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "authorizer", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    outputs: [{ name: "isUsed", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: fallback([
      http(process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com", { timeout: 5000 }),
      http("https://base-sepolia.blockpi.network/v1/rpc/public", { timeout: 5000 }),
      http("https://sepolia.base.org", { timeout: 5000 }),
    ]),
  });
}

export function getRelayerAccount() {
  const key = (process.env.FACILITATOR_RELAYER_KEY ||
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba") as Hex;
  return privateKeyToAccount(key);
}

export function getRelayerWalletClient() {
  const account = getRelayerAccount();
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: fallback([
      http(process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com", { timeout: 5000 }),
      http("https://base-sepolia.blockpi.network/v1/rpc/public", { timeout: 5000 }),
      http("https://sepolia.base.org", { timeout: 5000 }),
    ]),
  });
}

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
  const message = {
    from: auth.from as Hex,
    to: auth.to as Hex,
    value: BigInt(auth.value),
    validAfter: BigInt(auth.validAfter),
    validBefore: BigInt(auth.validBefore),
    nonce: auth.nonce as Hex,
  };

  // 1. First attempt with standard on-chain Base Sepolia domain name ("USDC")
  try {
    const recovered = await recoverTypedDataAddress({
      domain: EIP712_DOMAIN,
      types: EIP3009_TYPES,
      primaryType: "TransferWithAuthorization",
      message,
      signature: signature as Hex,
    });

    if (recovered.toLowerCase() === auth.from.toLowerCase()) {
      return { valid: true, recoveredAddress: recovered };
    }
  } catch {
    // Continue to fallback check
  }

  // 2. Fallback attempt with legacy name ("USD Coin")
  try {
    const recoveredFallback = await recoverTypedDataAddress({
      domain: EIP712_DOMAIN_FALLBACK,
      types: EIP3009_TYPES,
      primaryType: "TransferWithAuthorization",
      message,
      signature: signature as Hex,
    });

    if (recoveredFallback.toLowerCase() === auth.from.toLowerCase()) {
      return { valid: true, recoveredAddress: recoveredFallback };
    } else {
      return {
        valid: false,
        recoveredAddress: recoveredFallback,
        error: `Recovered signer ${recoveredFallback} does not match authorization.from ${auth.from}`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  }
}

