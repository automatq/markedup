import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/execution-plan/tasks?documentId=...
 * List all tasks for an execution plan, ordered by sortOrder.
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

    const tasks = await db.executionPlanTask.findMany({
      where: { documentId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /api/execution-plan/tasks error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

/**
 * POST /api/execution-plan/tasks
 * Create a new task in an execution plan.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, title, description, agentConfigId, assignedTo, blockedBy, dueDate } = body;

    if (!documentId || !title) {
      return NextResponse.json({ error: "documentId and title required" }, { status: 400 });
    }

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

    // Get next sort order
    const lastTask = await db.executionPlanTask.findFirst({
      where: { documentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextOrder = (lastTask?.sortOrder ?? -1) + 1;

    const task = await db.executionPlanTask.create({
      data: {
        documentId,
        title,
        description: description ?? undefined,
        agentConfigId: agentConfigId ?? undefined,
        assignedTo: assignedTo ?? undefined,
        blockedBy: blockedBy ?? [],
        dueDate: dueDate ? new Date(dueDate) : undefined,
        sortOrder: nextOrder,
        createdBy: userId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/execution-plan/tasks error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

/**
 * PATCH /api/execution-plan/tasks
 * Update an existing task.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.status !== undefined) {
      data.status = updates.status;
      if (updates.status === "completed") data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (updates.agentConfigId !== undefined) data.agentConfigId = updates.agentConfigId || null;
    if (updates.assignedTo !== undefined) data.assignedTo = updates.assignedTo || null;
    if (updates.blockedBy !== undefined) data.blockedBy = updates.blockedBy;
    if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;
    if (updates.dueDate !== undefined) data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

    const task = await db.executionPlanTask.update({
      where: { id },
      data,
    });

    return NextResponse.json(task);
  } catch (err) {
    console.error("PATCH /api/execution-plan/tasks error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

/**
 * DELETE /api/execution-plan/tasks?id=...
 * Delete a task from an execution plan.
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

    await db.executionPlanTask.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/execution-plan/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
