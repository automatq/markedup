import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

async function checkAccess(databaseId: string, userId: string, orgId: string | null) {
  const database = await db.database.findUnique({
    where: { id: databaseId },
    select: { workspaceId: true },
  });
  if (!database) return null;
  const ok = await canAccessWorkspace(database.workspaceId, userId, orgId);
  return ok ? database : null;
}

/**
 * POST /api/databases/[id]/rows
 * Create a new row in the database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await checkAccess(id, userId, orgId);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { values } = body;

    const last = await db.databaseRow.findFirst({
      where: { databaseId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const row = await db.databaseRow.create({
      data: {
        databaseId: id,
        values: values ?? {},
        sortOrder: (last?.sortOrder ?? -1) + 1,
        createdBy: userId,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("POST /api/databases/[id]/rows error:", err);
    return NextResponse.json({ error: "Failed to create row" }, { status: 500 });
  }
}

/**
 * PATCH /api/databases/[id]/rows
 * Update a row's values.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await checkAccess(id, userId, orgId);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { rowId, values, sortOrder } = body;
    if (!rowId) return NextResponse.json({ error: "rowId required" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (values !== undefined) data.values = values;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const row = await db.databaseRow.update({
      where: { id: rowId },
      data,
    });

    return NextResponse.json(row);
  } catch (err) {
    console.error("PATCH /api/databases/[id]/rows error:", err);
    return NextResponse.json({ error: "Failed to update row" }, { status: 500 });
  }
}

/**
 * DELETE /api/databases/[id]/rows?rowId=...
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const access = await checkAccess(id, userId, orgId);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rowId = request.nextUrl.searchParams.get("rowId");
    if (!rowId) return NextResponse.json({ error: "rowId required" }, { status: 400 });

    await db.databaseRow.delete({ where: { id: rowId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/databases/[id]/rows error:", err);
    return NextResponse.json({ error: "Failed to delete row" }, { status: 500 });
  }
}
