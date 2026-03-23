import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    const existing = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, deletedAt: true },
    });
    if (!existing || !existing.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canAccessWorkspace(existing.workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.document.update({
      where: { id: documentId },
      data: { deletedAt: null, deletedBy: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/documents/[id]/restore error:", err);
    return NextResponse.json(
      { error: "Failed to restore document" },
      { status: 500 }
    );
  }
}
