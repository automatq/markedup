import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/// Resolve a share token to a document (public — anyone with the link)
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
  } catch (err) {
    console.error("GET /api/share/[token] error:", err);
    return NextResponse.json({ error: "Failed to resolve share link" }, { status: 500 });
  }
}

/// Disable a share link (only the creator can do this)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    // Verify the user created this share link
    const link = await db.shareLink.findUnique({
      where: { token },
      select: { createdBy: true },
    });
    if (!link) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (link.createdBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.shareLink.update({
      where: { token },
      data: { enabled: false },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/share/[token] error:", err);
    return NextResponse.json({ error: "Failed to disable share link" }, { status: 500 });
  }
}
