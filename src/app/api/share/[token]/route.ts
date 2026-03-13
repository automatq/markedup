import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/// Resolve a share token to a document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const link = await db.shareLink.findUnique({
      where: { token },
      include: {
        document: {
          select: { id: true, title: true, workspaceId: true },
        },
      },
    });

    if (!link || !link.enabled) {
      return NextResponse.json({ error: "Link not found or disabled" }, { status: 404 });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      documentId: link.document.id,
      title: link.document.title,
      workspaceId: link.document.workspaceId,
      permission: link.permission,
    });
  } catch (err: any) {
    console.error("GET /api/share/[token] error:", err);
    return NextResponse.json({ error: "Failed to resolve share link" }, { status: 500 });
  }
}

/// Disable a share link
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await db.shareLink.update({
      where: { token },
      data: { enabled: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/share/[token] error:", err);
    return NextResponse.json({ error: "Failed to disable share link" }, { status: 500 });
  }
}
