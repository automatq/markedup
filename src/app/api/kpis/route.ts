import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

function getCurrentWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * GET /api/kpis?workspaceId=...&week=2026-W11&userId=...
 * Returns KPIs for the workspace. Optionally filtered by week and userId.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const week = request.nextUrl.searchParams.get("week") || getCurrentWeek();
    const filterUserId = request.nextUrl.searchParams.get("userId");

    const where: any = { workspaceId, week };
    if (filterUserId) where.userId = filterUserId;

    const kpis = await db.kpi.findMany({
      where,
      orderBy: [{ userId: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    // Group by user
    const byUser: Record<string, { userId: string; kpis: typeof kpis }> = {};
    for (const k of kpis) {
      if (!byUser[k.userId]) byUser[k.userId] = { userId: k.userId, kpis: [] };
      byUser[k.userId].kpis.push(k);
    }

    return NextResponse.json({
      week,
      currentWeek: getCurrentWeek(),
      members: Object.values(byUser),
      all: kpis,
    });
  } catch (err) {
    console.error("GET /api/kpis error:", err);
    return NextResponse.json({ error: "Failed to load KPIs" }, { status: 500 });
  }
}

/**
 * POST /api/kpis
 * Create or update a KPI.
 * Body: { workspaceId, userId, name, target, actual?, unit?, week?, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, orgId } = await auth();
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, userId, name, target, actual, unit, week, category } = body;

    if (!workspaceId || !userId || !name || target === undefined) {
      return NextResponse.json({ error: "workspaceId, userId, name, and target required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, authUserId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const kpiWeek = week || getCurrentWeek();

    const kpi = await db.kpi.upsert({
      where: {
        workspaceId_userId_name_week: { workspaceId, userId, name, week: kpiWeek },
      },
      update: {
        target,
        ...(actual !== undefined && { actual }),
        ...(unit && { unit }),
        ...(category && { category }),
      },
      create: {
        workspaceId,
        userId,
        name,
        target,
        actual: actual ?? 0,
        unit: unit || "",
        week: kpiWeek,
        category: category || "custom",
        createdBy: authUserId,
      },
    });

    return NextResponse.json(kpi);
  } catch (err) {
    console.error("POST /api/kpis error:", err);
    return NextResponse.json({ error: "Failed to save KPI" }, { status: 500 });
  }
}

/**
 * PATCH /api/kpis
 * Update actual value for a KPI.
 * Body: { id, actual } or { id, target, actual, name, unit, category }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.kpi.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "KPI not found" }, { status: 404 });

    if (!(await canAccessWorkspace(existing.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed: Record<string, any> = {};
    if (updates.actual !== undefined) allowed.actual = updates.actual;
    if (updates.target !== undefined) allowed.target = updates.target;
    if (updates.name) allowed.name = updates.name;
    if (updates.unit) allowed.unit = updates.unit;
    if (updates.category) allowed.category = updates.category;

    const kpi = await db.kpi.update({ where: { id }, data: allowed });
    return NextResponse.json(kpi);
  } catch (err) {
    console.error("PATCH /api/kpis error:", err);
    return NextResponse.json({ error: "Failed to update KPI" }, { status: 500 });
  }
}

/**
 * DELETE /api/kpis?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await db.kpi.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "KPI not found" }, { status: 404 });

    if (!(await canAccessWorkspace(existing.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.kpi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/kpis error:", err);
    return NextResponse.json({ error: "Failed to delete KPI" }, { status: 500 });
  }
}
