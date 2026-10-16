export interface PaymentAcceptEntry {
  scheme: string;
  network: string;
  amount: string | number;
  asset: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: {
    assetTransferMethod?: string;
    name?: string;
    version?: string;
  };
}

export interface PaymentChallenge {
  x402Version: number;
  error?: string;
  network?: string;
  asset?: string;
  amount?: number;
  payTo?: string;
  validBefore?: number;
  resource?: {
    url?: string;
    description?: string;
    mimeType?: string;
  };
  accepts?: PaymentAcceptEntry[];
  extensions?: Record<string, unknown>;
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
