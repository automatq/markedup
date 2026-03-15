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

    // Get all agent configs for this workspace
    const agents = await db.agentConfig.findMany({
      where: { workspaceId },
      select: { id: true, roleId: true },
    });

    // Fetch the latest digest for each agent
    const digests = await Promise.all(
      agents.map(async (agent) => {
        const report = await db.agentReport.findFirst({
          where: { workspaceId, agentId: agent.id, type: "monitor_digest" },
          orderBy: { createdAt: "desc" },
          select: { id: true, payload: true, createdAt: true },
        });
        return report ? { agentId: agent.id, roleId: agent.roleId, ...report } : null;
      })
    );

    return NextResponse.json({
      digests: digests.filter(Boolean),
    });
  } catch (err) {
    console.error("GET /api/agents/digests error:", err);
    return NextResponse.json({ error: "Failed to load digests" }, { status: 500 });
  }
}
