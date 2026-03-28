import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";
import { extractText } from "@/lib/extract-text";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, workspaceId: true, content: true, sourceType: true, createdAt: true, updatedAt: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canAccessWorkspace(document.workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (err) {
    console.error("GET /api/documents/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
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
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const hasAccess = await canAccessWorkspace(existing.workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, parentId } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) {
      data.content = content;
      // Extract plain text for full-text search indexing
      data.searchContent = extractText(content);
    }
    if (parentId !== undefined) data.parentId = parentId ?? null;

    const document = await db.document.update({
      where: { id: documentId },
      data,
      select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json(document);
  } catch (err) {
    console.error("PATCH /api/documents/[id] error:", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
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
      select: { workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const hasAccess = await canAccessWorkspace(existing.workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
