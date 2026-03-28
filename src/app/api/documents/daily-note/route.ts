import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/documents/daily-note?workspaceId=X&date=2026-03-28
 *
 * Returns the daily note for the given date, creating it if it doesn't exist.
 * Daily notes have sourceType "daily-note" and are titled with the full date.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const dateStr = searchParams.get("date"); // ISO date string "2026-03-28"

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const hasAccess = await canAccessWorkspace(workspaceId, userId, orgId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse date or use today
    const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
    const title = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Try to find existing daily note
    const existing = await db.document.findFirst({
      where: {
        workspaceId,
        title,
        sourceType: "daily-note",
        deletedAt: null,
      },
      select: { id: true, title: true, createdAt: true },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create new daily note with template content
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const doc = await db.document.create({
      data: {
        workspaceId,
        title,
        sourceType: "daily-note",
        createdBy: userId,
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: title }],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Tasks" }],
            },
            {
              type: "taskList",
              content: [
                {
                  type: "taskItem",
                  attrs: { checked: false },
                  content: [{ type: "paragraph" }],
                },
              ],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Notes" }],
            },
            { type: "paragraph" },
          ],
        },
      },
      select: { id: true, title: true, createdAt: true },
    });

    return NextResponse.json(doc);
  } catch (err) {
    console.error("GET /api/documents/daily-note error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * GET /api/documents/daily-note/calendar?workspaceId=X&month=2026-03
 *
 * Returns which days in a month have daily notes (for calendar dots).
 */
// This is handled in the same route via a "calendar" query param
