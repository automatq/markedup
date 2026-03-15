import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/graph?workspaceId=...
 * Returns nodes (documents) and edges (parent-child + backlinks) for the graph view.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch documents
    const documents = await db.document.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        id: true,
        title: true,
        parentId: true,
        sourceType: true,
        updatedAt: true,
        createdBy: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Fetch backlink edges from the Node table
    const docIds = documents.map((d) => d.id);
    const backlinks = await db.node.findMany({
      where: {
        sourceDocumentId: { in: docIds },
        targetDocumentId: { in: docIds },
      },
      select: {
        sourceDocumentId: true,
        targetDocumentId: true,
        linkText: true,
      },
    });

    // Build nodes
    const nodes = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.sourceType || "document",
      parentId: doc.parentId,
      updatedAt: doc.updatedAt,
    }));

    // Build edges: parent-child + backlinks
    const edges: { source: string; target: string; type: "parent" | "backlink"; label: string }[] = [];

    // Parent-child edges
    for (const doc of documents) {
      if (doc.parentId && docIds.includes(doc.parentId)) {
        edges.push({
          source: doc.parentId,
          target: doc.id,
          type: "parent",
          label: "",
        });
      }
    }

    // Backlink edges
    for (const link of backlinks) {
      edges.push({
        source: link.sourceDocumentId,
        target: link.targetDocumentId,
        type: "backlink",
        label: link.linkText,
      });
    }

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.error("GET /api/graph error:", err);
    return NextResponse.json({ error: "Failed to load graph data" }, { status: 500 });
  }
}
