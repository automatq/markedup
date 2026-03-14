import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    const existing = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, deletedAt: true },
    });
    if (!existing || !existing.deletedAt) {
      return NextResponse.json({ error: "Not found in trash" }, { status: 404 });
    }

    const workspace = await db.workspace.findFirst({
      where: { id: existing.workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.document.delete({ where: { id: documentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id]/permanent-delete error:", err);
    return NextResponse.json(
      { error: "Failed to permanently delete document" },
      { status: 500 }
    );
  }
}
