import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessDocument } from "@/lib/auth";

/// Create a share link for a document
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, permission = "view" } = await request.json();
    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Verify user can access the document before creating a share link
    if (!(await canAccessDocument(documentId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if a share link already exists for this document
    const existing = await db.shareLink.findFirst({
      where: { documentId, createdBy: userId, enabled: true },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const link = await db.shareLink.create({
      data: {
        documentId,
        createdBy: userId,
        permission,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/share error:", err);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
