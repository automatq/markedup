import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/agents/assignments?workspaceId=...
 * Returns all role assignments for the workspace (userId → agentConfig mapping).
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

    const assignments = await db.roleAssignment.findMany({
      where: { workspaceId },
      include: {
        agentConfig: {
          select: { id: true, roleId: true, name: true, title: true, color: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ assignments });
  } catch (err) {
    console.error("GET /api/agents/assignments error:", err);
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
  }
}

/**
 * POST /api/agents/assignments
 * Assign a team member to an agent role.
 * Body: { workspaceId, userId, agentConfigId }
 * Uses upsert — one role per user per workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, orgId } = await auth();
    if (!authUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, userId, agentConfigId } = body;

    if (!workspaceId || !userId || !agentConfigId) {
      return NextResponse.json({ error: "workspaceId, userId, and agentConfigId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, authUserId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignment = await db.roleAssignment.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: { agentConfigId },
      create: { workspaceId, userId, agentConfigId, assignedBy: authUserId },
      include: {
        agentConfig: {
          select: { id: true, roleId: true, name: true, title: true },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (err) {
    console.error("POST /api/agents/assignments error:", err);
    return NextResponse.json({ error: "Failed to save assignment" }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/assignments?id=...
 * Remove a role assignment.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const assignment = await db.roleAssignment.findUnique({ where: { id } });
    if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!(await canAccessWorkspace(assignment.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.roleAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/agents/assignments error:", err);
    return NextResponse.json({ error: "Failed to remove assignment" }, { status: 500 });
  }
}
