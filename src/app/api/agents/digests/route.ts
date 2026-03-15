import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/agents/digests?workspaceId=...
 * Returns the latest monitor_digest report for each agent in the workspace.
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

    // Fetch agents and all digest reports in two queries (no N+1)
    const [agents, allReports] = await Promise.all([
      db.agentConfig.findMany({
        where: { workspaceId },
        select: { id: true, roleId: true },
      }),
      db.agentReport.findMany({
        where: { workspaceId, type: "monitor_digest", agentId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { id: true, agentId: true, payload: true, createdAt: true },
      }),
    ]);

    // Pick the latest report per agent
    const agentRoleMap = new Map(agents.map((a) => [a.id, a.roleId]));
    const seen = new Set<string>();
    const digests = [];
    for (const report of allReports) {
      if (!report.agentId || seen.has(report.agentId)) continue;
      const roleId = agentRoleMap.get(report.agentId);
      if (!roleId) continue;
      seen.add(report.agentId);
      digests.push({ agentId: report.agentId, roleId, id: report.id, payload: report.payload, createdAt: report.createdAt });
    }

    return NextResponse.json({ digests });
  } catch (err) {
    console.error("GET /api/agents/digests error:", err);
    return NextResponse.json({ error: "Failed to load digests" }, { status: 500 });
  }
}
