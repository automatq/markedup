import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";
import { resolveUsers } from "@/lib/clerk-users";

/**
 * GET /api/operations?workspaceId=...&period=daily|weekly|monthly&cursor=...&limit=20
 * Returns paginated operations timeline digests, newest first.
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

    const period = request.nextUrl.searchParams.get("period") || undefined;
    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20", 10), 50);

    const digests = await db.operationsDigest.findMany({
      where: {
        workspaceId,
        ...(period && { period }),
      },
      orderBy: { periodStart: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = digests.length > limit;
    const items = hasMore ? digests.slice(0, limit) : digests;

    return NextResponse.json({
      digests: items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error("GET /api/operations error:", err);
    return NextResponse.json({ error: "Failed to load operations" }, { status: 500 });
  }
}

/**
 * POST /api/operations
 * Generate an operations digest for a specific period.
 * Body: { workspaceId, period: "daily"|"weekly"|"monthly", date?: "YYYY-MM-DD" }
 * If date is omitted, generates for yesterday (daily), last week (weekly), or last month (monthly).
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { workspaceId, period = "daily", date } = body;

    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const digest = await generateOperationsDigest(openai, workspaceId, period, date || undefined, userId);

    return NextResponse.json(digest);
  } catch (err) {
    console.error("POST /api/operations error:", err);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────── */

export async function generateOperationsDigest(
  openai: OpenAI,
  workspaceId: string,
  period: string,
  dateStr?: string,
  createdBy: string = "system"
) {
  const { periodStart, periodEnd } = computePeriodBounds(period, dateStr);

  // Check if already exists
  const existing = await db.operationsDigest.findUnique({
    where: { workspaceId_period_periodStart: { workspaceId, period, periodStart } },
  });
  if (existing) return existing;

  // Gather all activity for the period
  const [workspace, docs, breakouts, callLogs, kpis, prevDigest] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
    db.document.findMany({
      where: { workspaceId, deletedAt: null, OR: [{ createdAt: { gte: periodStart, lt: periodEnd } }, { updatedAt: { gte: periodStart, lt: periodEnd } }] },
      select: { id: true, title: true, createdBy: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.breakout.findMany({
      where: { document: { workspaceId, deletedAt: null }, createdAt: { gte: periodStart, lt: periodEnd } },
      select: { id: true, agentName: true, createdBy: true, createdAt: true, document: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.callLog.findMany({
      where: { workspaceId, createdAt: { gte: periodStart, lt: periodEnd } },
      select: { id: true, title: true, outcome: true, score: true, createdBy: true, createdAt: true, summary: true },
      orderBy: { createdAt: "desc" },
    }),
    db.kpi.findMany({
      where: { workspaceId },
      orderBy: { week: "desc" },
      take: 20,
    }),
    // Fetch previous period's digest for continuity
    db.operationsDigest.findFirst({
      where: { workspaceId, period, periodStart: { lt: periodStart } },
      orderBy: { periodStart: "desc" },
      select: { summary: true, metrics: true },
    }),
  ]);

  // Resolve user names
  const userIds = new Set<string>();
  for (const d of docs) if (d.createdBy) userIds.add(d.createdBy);
  for (const b of breakouts) if (b.createdBy) userIds.add(b.createdBy);
  for (const c of callLogs) if (c.createdBy) userIds.add(c.createdBy);
  const userMap = await resolveUsers(Array.from(userIds));

  // Build context for AI
  const docsCreated = docs.filter((d) => d.createdAt >= periodStart && d.createdAt < periodEnd).length;
  const docsEdited = docs.filter((d) => d.updatedAt >= periodStart && d.updatedAt < periodEnd && d.updatedAt.getTime() - d.createdAt.getTime() > 60000).length;
  const positiveCalls = callLogs.filter((c) => c.outcome === "positive").length;
  const avgCallScore = callLogs.length > 0 ? Math.round(callLogs.reduce((s, c) => s + (c.score || 0), 0) / callLogs.filter((c) => c.score != null).length) || 0 : 0;

  let context = `# Operations Report: ${workspace?.name || "Workspace"}\n`;
  context += `Period: ${period} — ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}\n\n`;

  context += `## Activity Summary\n`;
  context += `- Documents created: ${docsCreated}\n`;
  context += `- Documents edited: ${docsEdited}\n`;
  context += `- AI Breakouts generated: ${breakouts.length}\n`;
  context += `- Calls logged: ${callLogs.length} (${positiveCalls} positive, avg score: ${avgCallScore})\n\n`;

  context += `## Documents\n`;
  for (const d of docs.slice(0, 30)) {
    const author = d.createdBy ? (userMap[d.createdBy]?.name || "Unknown") : "Unknown";
    const isNew = d.createdAt >= periodStart && d.createdAt < periodEnd;
    context += `- ${isNew ? "[NEW]" : "[EDITED]"} "${d.title}" by ${author} (${d.updatedAt.toISOString().slice(0, 10)})\n`;
  }

  if (callLogs.length > 0) {
    context += `\n## Calls\n`;
    for (const c of callLogs.slice(0, 20)) {
      const caller = c.createdBy ? (userMap[c.createdBy]?.name || "Unknown") : "Unknown";
      context += `- ${c.title}: ${c.outcome || "unknown"} (score: ${c.score ?? "N/A"}) by ${caller}${c.summary ? ` — ${c.summary.slice(0, 100)}` : ""}\n`;
    }
  }

  if (breakouts.length > 0) {
    context += `\n## AI Breakouts\n`;
    for (const b of breakouts.slice(0, 15)) {
      context += `- ${b.agentName} on "${b.document.title}" (${b.createdAt.toISOString().slice(0, 10)})\n`;
    }
  }

  if (kpis.length > 0) {
    context += `\n## KPIs\n`;
    for (const k of kpis) {
      const pct = k.target > 0 ? Math.round((k.actual / k.target) * 100) : 0;
      context += `- ${k.name}: ${k.actual}/${k.target} ${k.unit} (${pct}%) [${k.week}]\n`;
    }
  }

  if (prevDigest) {
    context += `\n## Previous Period Summary (for continuity)\n`;
    context += (prevDigest.summary as string).slice(0, 500) + "\n";
  }

  const completion = await openai.chat.completions.create({
    model: "o4-mini",
    messages: [
      {
        role: "system",
        content: `You are a business operations historian. You create narrative chronicles of a company's journey — documenting what happened, what was achieved, what challenges were faced, and how the team is progressing toward their goals.

Write from a third-person omniscient perspective, like a company historian would. Be specific — reference actual document titles, call outcomes, team member names, and KPI numbers. This is a permanent record.

Respond ONLY with valid JSON matching this exact schema:

{
  "summary": "<3-5 paragraph narrative of what happened this ${period}. Write like a business chronicle — what was built, what was sold, what decisions were made, how the team performed. Reference specific documents, calls, and people by name.>",
  "headline": "<one punchy sentence capturing the period's theme — like a newspaper headline>",
  "metrics": {
    "docsCreated": <number>,
    "docsEdited": <number>,
    "breakouts": <number>,
    "callsLogged": <number>,
    "callWinRate": <0-100>,
    "avgCallScore": <0-100>,
    "kpiAttainment": <0-100 or null>,
    "momentum": "<accelerating|steady|decelerating|stalled>"
  },
  "highlights": [
    { "type": "<milestone|win|decision|risk|insight>", "text": "<what happened>", "date": "<YYYY-MM-DD>" }
  ],
  "docRefs": ["<documentId1>", "<documentId2>"],
  "trajectory": "<1-2 sentences on whether the company is trending up, plateauing, or needs course correction compared to previous period>"
}

Be honest and data-driven. If activity is low, say so. If results are strong, celebrate them. This chronicle should read as a truthful history when looked back on years later.`,
      },
      { role: "user", content: context },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let payload;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    payload = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse operations digest:", raw);
    payload = { summary: "Failed to generate digest", headline: "Error", metrics: {}, highlights: [], docRefs: [], trajectory: "" };
  }

  const digest = await db.operationsDigest.create({
    data: {
      workspaceId,
      period,
      periodStart,
      periodEnd,
      summary: payload.summary || "",
      metrics: payload.metrics || {},
      highlights: payload.highlights || [],
      docRefs: payload.docRefs || [],
      payload,
      createdBy,
    },
  });

  return digest;
}

function computePeriodBounds(period: string, dateStr?: string) {
  const ref = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();

  if (period === "daily") {
    const start = new Date(ref);
    if (!dateStr) start.setUTCDate(start.getUTCDate() - 1); // default to yesterday
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { periodStart: start, periodEnd: end };
  }

  if (period === "weekly") {
    const start = new Date(ref);
    if (!dateStr) start.setUTCDate(start.getUTCDate() - 7);
    const dayOfWeek = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - dayOfWeek); // Go to Sunday
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { periodStart: start, periodEnd: end };
  }

  // monthly
  const start = new Date(ref);
  if (!dateStr) start.setUTCMonth(start.getUTCMonth() - 1);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { periodStart: start, periodEnd: end };
}
