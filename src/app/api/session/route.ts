import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

/**
 * POST /api/session
 * Track user session. If returning after 30+ minutes, generate a briefing.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // Find existing session
    const existing = await db.sessionLog.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    const isNewSession = !existing || (now.getTime() - existing.lastActiveAt.getTime()) > SESSION_GAP_MS;
    const since = existing?.lastActiveAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Upsert session
    await db.sessionLog.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: {
        lastActiveAt: now,
        ...(isNewSession ? { startedAt: now } : {}),
      },
      create: {
        workspaceId,
        userId,
        lastActiveAt: now,
        startedAt: now,
      },
    });

    if (!isNewSession) {
      return NextResponse.json({ isNewSession: false });
    }

    // Generate quick briefing from workspace activity since last session
    const sinceDate = since;
    const [
      docsCreated,
      docsEdited,
      recentDocs,
      actionItems,
    ] = await Promise.all([
      db.document.count({
        where: { workspaceId, deletedAt: null, createdAt: { gte: sinceDate } },
      }),
      db.document.count({
        where: { workspaceId, deletedAt: null, updatedAt: { gte: sinceDate }, createdAt: { lt: sinceDate } },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null, updatedAt: { gte: sinceDate } },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.actionItem.findMany({
        where: { workspaceId, status: { in: ["pending", "in_progress"] } },
        select: { id: true, title: true, priority: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const hoursAway = Math.round((now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60));
    const timeAway = hoursAway >= 24
      ? `${Math.round(hoursAway / 24)} day${Math.round(hoursAway / 24) !== 1 ? "s" : ""}`
      : `${hoursAway} hour${hoursAway !== 1 ? "s" : ""}`;

    const changes: string[] = [];
    if (docsCreated > 0) changes.push(`${docsCreated} new document${docsCreated !== 1 ? "s" : ""} created`);
    if (docsEdited > 0) changes.push(`${docsEdited} document${docsEdited !== 1 ? "s" : ""} edited`);

    return NextResponse.json({
      isNewSession: true,
      briefing: {
        timeAway,
        summary: changes.length > 0
          ? `While you were away: ${changes.join(", ")}.`
          : "No changes while you were away.",
        changes,
        recentDocs,
        pendingActions: actionItems,
      },
    });
  } catch (err) {
    console.error("POST /api/session error:", err);
    return NextResponse.json({ error: "Failed to track session" }, { status: 500 });
  }
}
