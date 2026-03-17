import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";
import { resolveUsers } from "@/lib/clerk-users";

/**
 * GET /api/actions?workspaceId=...&status=pending&assignedTo=...
 * Returns action items for a workspace with filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const assignedTo = request.nextUrl.searchParams.get("assignedTo") || undefined;

    const actions = await db.actionItem.findMany({
      where: {
        workspaceId,
        ...(status && { status }),
        ...(assignedTo && { assignedTo }),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    // Resolve user names
    const userIds = new Set<string>();
    for (const a of actions) {
      if (a.assignedTo) userIds.add(a.assignedTo);
      if (a.createdBy) userIds.add(a.createdBy);
    }
    const userMap = await resolveUsers(Array.from(userIds));

    return NextResponse.json({
      actions: actions.map((a) => ({
        ...a,
        assignedToName: a.assignedTo ? userMap[a.assignedTo]?.name : null,
        createdByName: userMap[a.createdBy]?.name || "System",
      })),
    });
  } catch (err) {
    console.error("GET /api/actions error:", err);
    return NextResponse.json({ error: "Failed to load actions" }, { status: 500 });
  }
}

/**
 * POST /api/actions
 * Create action item manually OR auto-extract from text.
 * Body: { workspaceId, title?, text?, sourceType?, sourceId?, sourceTitle?, assignedTo?, dueDate?, autoExtract? }
 * If autoExtract=true and text is provided, uses AI to extract multiple action items.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, title, text, sourceType, sourceId, sourceTitle, assignedTo, dueDate, autoExtract } = body;

    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-extract mode: AI finds action items in text
    if (autoExtract && text) {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract all action items, tasks, commitments, and follow-ups from the text. Return ONLY valid JSON array:
[
  { "title": "<concise action>", "priority": "low|medium|high|urgent", "dueHint": "<relative date if mentioned, or null>" }
]
If no actions found, return []. Be thorough — catch implicit commitments like "I'll..." or "We should..." or "Let's..." or "Need to...".`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      let items: { title: string; priority?: string; dueHint?: string }[];
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
        items = JSON.parse(cleaned);
      } catch {
        items = [];
      }

      if (items.length === 0) {
        return NextResponse.json({ actions: [], message: "No action items found" });
      }

      // Parse relative due dates
      const parseDueHint = (hint?: string | null): Date | null => {
        if (!hint) return null;
        const now = new Date();
        const lower = hint.toLowerCase();
        if (lower.includes("today")) return now;
        if (lower.includes("tomorrow")) { now.setDate(now.getDate() + 1); return now; }
        if (lower.includes("next week")) { now.setDate(now.getDate() + 7); return now; }
        if (lower.includes("friday")) {
          const day = now.getDay();
          const diff = (5 - day + 7) % 7 || 7;
          now.setDate(now.getDate() + diff);
          return now;
        }
        if (lower.includes("end of week")) { now.setDate(now.getDate() + (5 - now.getDay())); return now; }
        if (lower.includes("end of month")) { now.setMonth(now.getMonth() + 1, 0); return now; }
        return null;
      };

      const created = await db.actionItem.createManyAndReturn({
        data: items.map((item) => ({
          workspaceId,
          title: item.title,
          priority: item.priority || "medium",
          sourceType: sourceType || "document",
          sourceId: sourceId || null,
          sourceTitle: sourceTitle || null,
          dueDate: parseDueHint(item.dueHint),
          createdBy: userId,
        })),
      });

      return NextResponse.json({ actions: created, extracted: items.length });
    }

    // Manual create mode
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const action = await db.actionItem.create({
      data: {
        workspaceId,
        title,
        sourceType: sourceType || "manual",
        sourceId: sourceId || null,
        sourceTitle: sourceTitle || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: userId,
      },
    });

    return NextResponse.json(action);
  } catch (err) {
    console.error("POST /api/actions error:", err);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}

/**
 * PATCH /api/actions
 * Update action item (status, assignedTo, priority, dueDate).
 * Body: { id, status?, assignedTo?, priority?, dueDate? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status, assignedTo, priority, dueDate } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const update: any = {};
    if (status) update.status = status;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (priority) update.priority = priority;
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
    if (status === "completed") update.completedAt = new Date();

    const action = await db.actionItem.update({ where: { id }, data: update });
    return NextResponse.json(action);
  } catch (err) {
    console.error("PATCH /api/actions error:", err);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}

/**
 * DELETE /api/actions?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.actionItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/actions error:", err);
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 });
  }
}
