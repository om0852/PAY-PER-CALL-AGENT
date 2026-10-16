import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { getPublicClient, getRelayerAccount, USDC_ABI } from "@/lib/x402/eip3009";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetAddress = searchParams.get("address");

    const publicClient = getPublicClient();
    const relayer = getRelayerAccount();
    const usdcAddress = (process.env.USDC_CONTRACT_ADDRESS ||
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;

    // 1. Fetch current Base Sepolia network stats
    const [blockNumber, gasPrice] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getGasPrice(),
    ]);

    // 2. Fetch Relayer on-chain status
    const relayerEthBalance = await publicClient.getBalance({
      address: relayer.address,
    });

    let relayerUsdcBalance = BigInt(0);
    try {
      relayerUsdcBalance = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [relayer.address],
      });
    } catch {
      // Ignore if contract call fails
    }

    // 3. If a specific address is requested, query its balances
    let queriedBalance = null;
    if (targetAddress && targetAddress.startsWith("0x")) {
      const addr = targetAddress as `0x${string}`;
      const [eth, usdc] = await Promise.all([
        publicClient.getBalance({ address: addr }).catch(() => BigInt(0)),
        publicClient
          .readContract({
            address: usdcAddress,
            abi: USDC_ABI,
            functionName: "balanceOf",
            args: [addr],
          })
          .catch(() => BigInt(0)),
      ]);

      queriedBalance = {
        address: addr,
        ethBalance: formatEther(eth),
        usdcBalance: (Number(usdc) / 1e6).toFixed(6),
        usdcAtomic: usdc.toString(),
      };
    }

    return NextResponse.json({
      network: "Base Sepolia",
      chainId: 84532,
      blockNumber: blockNumber.toString(),
      gasPriceGwei: (Number(gasPrice) / 1e9).toFixed(4),
      usdcContract: usdcAddress,
      explorerUrl: "https://sepolia.basescan.org",
      relayer: {
        address: relayer.address,
        ethBalance: formatEther(relayerEthBalance),
        usdcBalance: (Number(relayerUsdcBalance) / 1e6).toFixed(6),
      },
      queried: queriedBalance,
      faucets: {
        baseSepoliaEth: "https://www.alchemy.com/faucets/base-sepolia",
        circleUsdc: "https://faucet.circle.com",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to query on-chain Base Sepolia state: ${msg}` },
      { status: 500 }
    );
  }
}
