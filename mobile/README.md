# AgentBucket Mobile App (React Native / Expo)

A decentralized, gasless Pay-Per-Call autonomous agent wallet & monitoring application for Android & iOS.

## Features
- **Dual-Wallet Balances**: Real-time tracking of Buyer Agent budget & Seller earned micro-settlements on Base Sepolia L2.
- **Top-Up Balance**: Easily add +$5, +$10, +$25 USDC to your buyer wallet directly from your mobile device.
- **Smart Push Alerts**:
  - ⚠️ **Low Balance Alert**: Real-time warnings when buyer wallet drops below $2.00 USDC.
  - ❌ **Failed Task Alert**: Immediate notifications when schema validation disputes occur (with 100% auto-refund verification).
  - 🔴 **Service Down Alert**: Alerts if provider nodes become degraded or unreachable.
- **Transaction History**: Audit trail of signed EIP-3009 micro-settlements with gasless badges and transaction hashes.
- **Services Monitor**: Real-time health, latency (ms), and pricing for all registered AI and data services (including XML-to-JSON and Sentiment Categorizer).
- **Mobile Agent Runner**: Launch autonomous agent workflows directly from your phone.

## Quick Start

```bash
cd mobile
npm install
npm start
```

- Scan the QR code with **Expo Go** on your Android or iOS device.
- Ensure your mobile device is on the same local Wi-Fi network as the machine running the Next.js backend (`http://<your-lan-ip>:3000`).
