import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, workspaceId: true, content: true, updatedAt: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    const { documentId } = await params;
    const body = await request.json();
    const { title, content } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;

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
    const { documentId } = await params;
    await db.document.delete({ where: { id: documentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
