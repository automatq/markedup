import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export async function GET() {
  const url = process.env.DATABASE_URL;
  const checks: Record<string, any> = {
    env: {
      DATABASE_URL: url ? `set (starts: ${url.substring(0, 15)}...)` : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  try {
    // Test direct pool connection (bypass Prisma)
    const pool = new Pool({ connectionString: url });
    const result = await pool.query("SELECT 1 as ok");
    checks.db = "connected";
    checks.result = result.rows;
    await pool.end();
  } catch (err: any) {
    checks.db = { error: err?.message ?? String(err) };
  }

  const ok = checks.db === "connected";
  return NextResponse.json(checks, { status: ok ? 200 : 500 });
}
