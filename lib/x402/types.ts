export interface PaymentChallenge {
  x402Version: number;
  network: string;
  asset: string;
  amount: number; // Integer atomic units
  payTo: string;
  validBefore?: number;
}

export interface PaymentAuthorization {
  from: string;
  to: string;
  value: number;
  validAfter: number;
  validBefore: number;
  nonce: string; // 32-byte hex
}

export interface PaymentSignaturePayload {
  authorization: PaymentAuthorization;
  signature: string; // 65-byte hex (0x...)
}

export interface PaymentResponsePayload {
  settled: boolean;
  txHash: string;
  network: string;
  error?: string;
}

export interface VerifyRequest {
  x402Version: number;
  network: string;
  asset: string;
  amount: number;
  payTo: string;
  authorization: PaymentAuthorization;
  signature: string;
}

export interface VerifyResponse {
  valid: boolean;
  error?: string;
}

export interface SettleRequest {
  authorization: PaymentAuthorization;
  signature: string;
  network?: string;
}

export interface SettleResponse {
  settled: boolean;
  txHash?: string;
  error?: string;
}
