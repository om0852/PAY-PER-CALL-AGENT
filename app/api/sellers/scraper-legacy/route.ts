import { NextResponse } from "next/server";

// Simulates an unmaintained, broken legacy scraper cluster that returns 503 Gateway Timeout
export async function POST() {
  return NextResponse.json(
    {
      error: "503 Service Unavailable: Legacy scraper cluster unreachable or gateway timed out",
      code: "CLUSTER_DOWN",
      timestamp: new Date().toISOString(),
    },
    { status: 503 }
  );
}

export async function GET() {
  return POST();
}
