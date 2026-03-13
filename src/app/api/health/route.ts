import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    },
  };

  try {
    // Test raw query
    await db.$queryRawUnsafe("SELECT 1 as ok");
    checks.db = "connected";
  } catch (err: any) {
    checks.db = { error: err?.message ?? String(err) };
  }

  const ok = checks.db === "connected";
  return NextResponse.json(checks, { status: ok ? 200 : 500 });
}
