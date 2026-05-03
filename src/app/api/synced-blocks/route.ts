import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/synced-blocks?workspaceId=...
 * List synced blocks for a workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const blocks = await db.syncedBlock.findMany({
      where: { workspaceId },
      select: { id: true, label: true, updatedAt: true, createdBy: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(blocks);
  } catch (err) {
    console.error("GET /api/synced-blocks error:", err);
    return NextResponse.json({ error: "Failed to fetch synced blocks" }, { status: 500 });
  }
}

/**
 * POST /api/synced-blocks
 * Create a new synced block.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, content, label } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const block = await db.syncedBlock.create({
      data: {
        workspaceId,
        content: content ?? { type: "doc", content: [{ type: "paragraph" }] },
        label: label ?? null,
        createdBy: userId,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    console.error("POST /api/synced-blocks error:", err);
    return NextResponse.json({ error: "Failed to create synced block" }, { status: 500 });
  }
}
