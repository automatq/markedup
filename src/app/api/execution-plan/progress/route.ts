import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";

/**
 * GET /api/execution-plan/progress?documentId=...
 * Returns computed progress for an execution plan.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const tasks = await db.executionPlanTask.findMany({
      where: { documentId },
      select: { status: true },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const notStarted = tasks.filter((t) => t.status === "not_started").length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      total,
      completed,
      inProgress,
      blocked,
      notStarted,
      percentComplete,
    });
  } catch (err) {
    console.error("GET /api/execution-plan/progress error:", err);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
