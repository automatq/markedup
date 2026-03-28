import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/documents/search?workspaceId=X&q=search+terms
 *
 * Full-text search across document titles and content.
 * Returns matching documents with highlighted snippets.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const query = searchParams.get("q")?.trim();

    if (!workspaceId || !query) {
      return NextResponse.json({ error: "Missing workspaceId or q" }, { status: 400 });
    }

    const hasAccess = await canAccessWorkspace(workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const q = query.toLowerCase();

    // Search in title and searchContent
    const documents = await db.document.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { searchContent: { contains: query, mode: "insensitive" as const } },
        ],
      },
      select: {
        id: true,
        title: true,
        searchContent: true,
        updatedAt: true,
        parentId: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    // Build results with snippets
    const results = documents.map((doc) => {
      let snippet = "";
      if (doc.searchContent) {
        const lower = doc.searchContent.toLowerCase();
        const idx = lower.indexOf(q);
        if (idx >= 0) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(doc.searchContent.length, idx + q.length + 60);
          snippet =
            (start > 0 ? "…" : "") +
            doc.searchContent.slice(start, end) +
            (end < doc.searchContent.length ? "…" : "");
        }
      }

      return {
        id: doc.id,
        title: doc.title,
        snippet,
        updatedAt: doc.updatedAt,
        matchType: doc.title.toLowerCase().includes(q) ? "title" : "content",
      };
    });

    // Sort: title matches first, then content matches
    results.sort((a, b) => {
      if (a.matchType === "title" && b.matchType !== "title") return -1;
      if (a.matchType !== "title" && b.matchType === "title") return 1;
      return 0;
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/documents/search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
