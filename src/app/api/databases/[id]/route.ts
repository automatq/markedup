import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/databases/[id]
 * Get a single database with all its properties, rows, and views.
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
    const database = await db.database.findUnique({
      where: { id },
      include: {
        properties: { orderBy: { sortOrder: "asc" } },
        views: { orderBy: { sortOrder: "asc" } },
        rows: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!database) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(database.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(database);
  } catch (err) {
    console.error("GET /api/databases/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch database" }, { status: 500 });
  }
}

/**
 * PATCH /api/databases/[id]
 * Update database title or icon.
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
    const existing = await db.database.findUnique({
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
    if (body.title !== undefined) data.title = body.title;
    if (body.icon !== undefined) data.icon = body.icon;

    const database = await db.database.update({ where: { id }, data });
    return NextResponse.json(database);
  } catch (err) {
    console.error("PATCH /api/databases/[id] error:", err);
    return NextResponse.json({ error: "Failed to update database" }, { status: 500 });
  }
}

/**
 * DELETE /api/databases/[id]
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
    const existing = await db.database.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(existing.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.database.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/databases/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete database" }, { status: 500 });
  }
}
