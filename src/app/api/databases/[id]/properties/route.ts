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
 * POST /api/databases/[id]/properties
 * Create a new property column.
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
    const { type, name, config } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type and name required" }, { status: 400 });
    }

    const last = await db.databaseProperty.findFirst({
      where: { databaseId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const property = await db.databaseProperty.create({
      data: {
        databaseId: id,
        type,
        name,
        config: config ?? {},
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error("POST /api/databases/[id]/properties error:", err);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}

/**
 * PATCH /api/databases/[id]/properties
 * Update an existing property.
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
    const { propertyId, ...updates } = body;
    if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.config !== undefined) data.config = updates.config;
    if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;

    const property = await db.databaseProperty.update({
      where: { id: propertyId },
      data,
    });

    return NextResponse.json(property);
  } catch (err) {
    console.error("PATCH /api/databases/[id]/properties error:", err);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

/**
 * DELETE /api/databases/[id]/properties?propertyId=...
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

    const propertyId = request.nextUrl.searchParams.get("propertyId");
    if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

    await db.databaseProperty.delete({ where: { id: propertyId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/databases/[id]/properties error:", err);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}
