import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/agents/monitor?workspaceId=...
 * Returns all agent monitors for the workspace with their agent config info.
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

    // Get all agents with their monitor status
    const agents = await db.agentConfig.findMany({
      where: { workspaceId },
      select: { id: true, name: true, title: true, roleId: true, color: true, avatar: true },
    });

    const monitors = await db.agentMonitor.findMany({
      where: { workspaceId },
    });

    const monitorMap = new Map(monitors.map((m) => [m.agentConfigId, m]));

    const result = agents.map((a) => {
      const monitor = monitorMap.get(a.id);
      return {
        agent: a,
        monitor: monitor
          ? {
              id: monitor.id,
              enabled: monitor.enabled,
              watchList: monitor.watchList,
              frequency: monitor.frequency,
              lastRunAt: monitor.lastRunAt,
            }
          : null,
      };
    });

    return NextResponse.json({ agents: result });
  } catch (err) {
    console.error("GET /api/agents/monitor error:", err);
    return NextResponse.json({ error: "Failed to load agent monitors" }, { status: 500 });
  }
}

/**
 * POST /api/agents/monitor
 * Toggle or configure an agent's monitoring.
 * Body: { workspaceId, agentConfigId, enabled, watchList?, frequency? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, agentConfigId, enabled, watchList, frequency } = body;

    if (!workspaceId || !agentConfigId) {
      return NextResponse.json({ error: "workspaceId and agentConfigId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const monitor = await db.agentMonitor.upsert({
      where: {
        workspaceId_agentConfigId: { workspaceId, agentConfigId },
      },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(watchList && { watchList }),
        ...(frequency && { frequency }),
      },
      create: {
        workspaceId,
        agentConfigId,
        enabled: enabled ?? false,
        watchList: watchList || ["docs", "calls", "kpis"],
        frequency: frequency || "weekly",
        createdBy: userId,
      },
    });

    return NextResponse.json(monitor);
  } catch (err) {
    console.error("POST /api/agents/monitor error:", err);
    return NextResponse.json({ error: "Failed to update agent monitor" }, { status: 500 });
  }
}
