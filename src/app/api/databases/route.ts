import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/databases?workspaceId=...
 * List all databases for a workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const databases = await db.database.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { rows: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(databases);
  } catch (err) {
    console.error("GET /api/databases error:", err);
    return NextResponse.json({ error: "Failed to fetch databases" }, { status: 500 });
  }
}

/**
 * POST /api/databases
 * Create a new database with default property + view.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, title, documentId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create database with default Title + Status property and Table view
    const database = await db.database.create({
      data: {
        workspaceId,
        documentId: documentId ?? null,
        title: title ?? "Untitled Database",
        createdBy: userId,
        properties: {
          create: [
            { type: "title", name: "Name", sortOrder: 0 },
            {
              type: "status",
              name: "Status",
              sortOrder: 1,
              config: {
                options: [
                  { id: "todo", label: "Todo", color: "#737373" },
                  { id: "in-progress", label: "In Progress", color: "#3b82f6" },
                  { id: "done", label: "Done", color: "#22c55e" },
                ],
              },
            },
          ],
        },
        views: {
          create: [
            { type: "table", name: "Table", sortOrder: 0 },
            { type: "board", name: "Board", sortOrder: 1, config: {} },
          ],
        },
      },
      include: {
        properties: { orderBy: { sortOrder: "asc" } },
        views: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(database, { status: 201 });
  } catch (err) {
    console.error("POST /api/databases error:", err);
    return NextResponse.json({ error: "Failed to create database" }, { status: 500 });
  }
}
