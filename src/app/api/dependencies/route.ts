import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/dependencies?documentId=...
 * Returns all typed dependency relationships for a document.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    // Verify access
    const doc = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(doc.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all dependency relationships (both directions)
    const [outgoing, incoming] = await Promise.all([
      db.node.findMany({
        where: {
          sourceDocumentId: documentId,
          type: { not: "backlink" },
        },
        include: {
          targetDocument: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.node.findMany({
        where: {
          targetDocumentId: documentId,
          type: { not: "backlink" },
        },
        include: {
          sourceDocument: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ outgoing, incoming });
  } catch (err) {
    console.error("GET /api/dependencies error:", err);
    return NextResponse.json({ error: "Failed to fetch dependencies" }, { status: 500 });
  }
}

/**
 * POST /api/dependencies
 * Create a typed dependency relationship between documents.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceDocumentId, targetDocumentId, type, linkText } = body;

    if (!sourceDocumentId || !targetDocumentId || !type) {
      return NextResponse.json(
        { error: "sourceDocumentId, targetDocumentId, and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["depends_on", "blocks", "related"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify access to source document
    const doc = await db.document.findUnique({
      where: { id: sourceDocumentId },
      select: { workspaceId: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Source document not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(doc.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const node = await db.node.create({
      data: {
        sourceDocumentId,
        targetDocumentId,
        type,
        linkText: linkText || type,
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch (err) {
    console.error("POST /api/dependencies error:", err);
    return NextResponse.json({ error: "Failed to create dependency" }, { status: 500 });
  }
}

/**
 * DELETE /api/dependencies?id=...
 * Remove a dependency relationship.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await db.node.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/dependencies error:", err);
    return NextResponse.json({ error: "Failed to delete dependency" }, { status: 500 });
  }
}
