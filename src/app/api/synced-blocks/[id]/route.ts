import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/synced-blocks/[id]
 * Get a single synced block's content.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const block = await db.syncedBlock.findUnique({
      where: { id },
    });
    if (!block) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(block.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(block);
  } catch (err) {
    console.error("GET /api/synced-blocks/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch synced block" }, { status: 500 });
  }
}

/**
 * PATCH /api/synced-blocks/[id]
 * Update a synced block's content or label.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.syncedBlock.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(existing.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.content !== undefined) data.content = body.content;
    if (body.label !== undefined) data.label = body.label;

    const block = await db.syncedBlock.update({
      where: { id },
      data,
    });

    return NextResponse.json(block);
  } catch (err) {
    console.error("PATCH /api/synced-blocks/[id] error:", err);
    return NextResponse.json({ error: "Failed to update synced block" }, { status: 500 });
  }
}

/**
 * DELETE /api/synced-blocks/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.syncedBlock.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(existing.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.syncedBlock.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/synced-blocks/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete synced block" }, { status: 500 });
  }
}
