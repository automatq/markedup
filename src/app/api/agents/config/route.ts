import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * GET /api/agents/config?workspaceId=...
 * List agent configs for a workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    // Verify access
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          ...(orgId ? [{ orgId, isPersonal: false }] : []),
        ],
      },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agents = await db.agentConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(agents);
  } catch (err: any) {
    console.error("GET /api/agents/config error:", err);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

/**
 * POST /api/agents/config
 * Create a new agent config for a workspace.
 * Body: { workspaceId, roleId, name, title, color, avatar, description, systemPrompt }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, roleId, name, title, color, avatar, description, systemPrompt } = body;

    if (!workspaceId || !roleId || !name || !title || !description || !systemPrompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify access
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          ...(orgId ? [{ orgId, isPersonal: false }] : []),
        ],
      },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agent = await db.agentConfig.create({
      data: {
        workspaceId,
        roleId: roleId.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        name,
        title,
        color: color || "#6366f1",
        avatar: avatar || name.charAt(0).toUpperCase(),
        description,
        systemPrompt,
        createdBy: userId,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (err: any) {
    // Unique constraint violation = duplicate roleId
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "An agent with this role ID already exists in this workspace" }, { status: 409 });
    }
    console.error("POST /api/agents/config error:", err);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}

/**
 * PATCH /api/agents/config
 * Update an agent config.
 * Body: { id, name?, title?, color?, avatar?, description?, systemPrompt? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Verify access via workspace
    const existing = await db.agentConfig.findUnique({
      where: { id },
      include: { workspace: { select: { ownerId: true, orgId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (existing.workspace.ownerId !== userId && existing.workspace.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = ["name", "title", "color", "avatar", "description", "systemPrompt"];
    const data: Record<string, string> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) data[key] = updates[key];
    }

    const updated = await db.agentConfig.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/agents/config error:", err);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/config?id=...
 * Delete an agent config.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await db.agentConfig.findUnique({
      where: { id },
      include: { workspace: { select: { ownerId: true, orgId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (existing.workspace.ownerId !== userId && existing.workspace.orgId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.agentConfig.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/agents/config error:", err);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
