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

    const doc = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canAccessWorkspace(doc.workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const favorite = await db.favorite.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId },
      update: {},
    });

    return NextResponse.json(favorite);
  } catch (err) {
    console.error("POST /api/documents/[id]/favorite error:", err);
    return NextResponse.json({ error: "Failed to favorite" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    await db.favorite.deleteMany({
      where: { userId, documentId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id]/favorite error:", err);
    return NextResponse.json({ error: "Failed to unfavorite" }, { status: 500 });
  }
}
