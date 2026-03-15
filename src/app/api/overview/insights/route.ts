import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * POST /api/overview/insights
 * Agents analyze workspace activity and generate:
 * - Signal/Noise scores per team member
 * - Short-term vs Long-term vision alignment
 * - CTO GitHub workflow log (if GitHub is configured)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const { workspaceId } = await request.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel data fetches
    const [
      workspace,
      allDocs,
      recentDocs,
      recentBreakouts,
      recentCallLogs,
      agentConfigs,
      githubIntegrations,
    ] = await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, title: true, createdBy: true, createdAt: true, updatedAt: true, content: true },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null, updatedAt: { gte: sevenDaysAgo } },
        select: { id: true, title: true, createdBy: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.breakout.findMany({
        where: { document: { workspaceId, deletedAt: null }, createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, agentName: true, content: true, createdBy: true, createdAt: true, document: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.callLog.findMany({
        where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, title: true, summary: true, outcome: true, score: true, createdBy: true, createdAt: true, actionItems: true },
        orderBy: { createdAt: "desc" },
      }),
      db.agentConfig.findMany({
        where: { workspaceId },
        select: { id: true, name: true, title: true, roleId: true, systemPrompt: true },
      }),
      db.workspaceIntegration.findMany({
        where: { workspaceId, type: "github" },
      }),
    ]);

    // Resolve user names
    const userIdSet = new Set<string>();
    for (const d of recentDocs) if (d.createdBy) userIdSet.add(d.createdBy);
    for (const b of recentBreakouts) if (b.createdBy) userIdSet.add(b.createdBy);
    for (const c of recentCallLogs) if (c.createdBy) userIdSet.add(c.createdBy);

    const userMap: Record<string, string> = {};
    if (userIdSet.size > 0) {
      try {
        const clerk = await clerkClient();
        const users = await Promise.all(
          Array.from(userIdSet).map((id) => clerk.users.getUser(id).catch(() => null))
        );
        for (const u of users) {
          if (u) {
            userMap[u.id] = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.emailAddresses[0]?.emailAddress || "Unknown";
          }
        }
      } catch {}
    }

    // Fetch GitHub commits if configured
    let githubContext = "";
    for (const integration of githubIntegrations) {
      const config = integration.config as { owner: string; repo: string; token?: string };
      try {
        const headers: Record<string, string> = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "MarkedUp",
        };
        if (config.token) {
          const prefix = config.token.startsWith("github_pat_") ? "Bearer" : "token";
          headers.Authorization = `${prefix} ${config.token}`;
        }
        const ghRes = await fetch(
          `https://api.github.com/repos/${config.owner}/${config.repo}/commits?since=${sevenDaysAgo.toISOString()}&per_page=50`,
          { headers }
        );
        if (ghRes.ok) {
          const commits = await ghRes.json();
          githubContext += `\n\n## GitHub Activity (${config.owner}/${config.repo}) - Last 7 Days\n`;
          githubContext += `Total commits: ${commits.length}\n`;
          for (const c of commits.slice(0, 30)) {
            const author = c.commit?.author?.name || "Unknown";
            const date = c.commit?.author?.date?.slice(0, 10) || "";
            const msg = c.commit?.message?.split("\n")[0] || "";
            githubContext += `- [${date}] ${author}: ${msg}\n`;
          }
        }
      } catch {}
    }

    // Build activity summary for AI
    let activitySummary = `# Workspace: ${workspace?.name || "Unknown"}\n\n`;
    activitySummary += `## Documents (${allDocs.length} total, ${recentDocs.length} active this week)\n`;

    // Per-member summary
    const memberStats: Record<string, { name: string; docsCreated: number; docsEdited: number; breakouts: number; calls: number; callScoreTotal: number; callCount: number }> = {};
    for (const d of allDocs) {
      if (!d.createdBy) continue;
      if (!memberStats[d.createdBy]) {
        memberStats[d.createdBy] = { name: userMap[d.createdBy] || "Unknown", docsCreated: 0, docsEdited: 0, breakouts: 0, calls: 0, callScoreTotal: 0, callCount: 0 };
      }
      if (new Date(d.createdAt).getTime() >= thirtyDaysAgo.getTime()) memberStats[d.createdBy].docsCreated++;
      if (new Date(d.updatedAt).getTime() >= sevenDaysAgo.getTime()) memberStats[d.createdBy].docsEdited++;
    }
    for (const b of recentBreakouts) {
      if (b.createdBy && memberStats[b.createdBy]) memberStats[b.createdBy].breakouts++;
    }
    for (const c of recentCallLogs) {
      if (!c.createdBy) continue;
      if (!memberStats[c.createdBy]) {
        memberStats[c.createdBy] = { name: userMap[c.createdBy] || "Unknown", docsCreated: 0, docsEdited: 0, breakouts: 0, calls: 0, callScoreTotal: 0, callCount: 0 };
      }
      memberStats[c.createdBy].calls++;
      if (c.score) {
        memberStats[c.createdBy].callScoreTotal += c.score;
        memberStats[c.createdBy].callCount++;
      }
    }

    activitySummary += `\n## Team Member Activity (Last 30 days)\n`;
    for (const [id, m] of Object.entries(memberStats)) {
      const avgScore = m.callCount > 0 ? Math.round(m.callScoreTotal / m.callCount) : null;
      activitySummary += `- ${m.name}: ${m.docsCreated} docs created, ${m.docsEdited} edited this week, ${m.breakouts} breakouts, ${m.calls} calls${avgScore ? ` (avg score: ${avgScore}/100)` : ""}\n`;
    }

    // Breakout summaries
    activitySummary += `\n## Recent AI Breakouts (${recentBreakouts.length} in 30 days)\n`;
    for (const b of recentBreakouts.slice(0, 10)) {
      activitySummary += `- ${b.agentName} on "${b.document.title}": ${b.content.slice(0, 150)}...\n`;
    }

    // Call summaries
    activitySummary += `\n## Recent Calls (${recentCallLogs.length} in 30 days)\n`;
    for (const c of recentCallLogs.slice(0, 10)) {
      activitySummary += `- ${c.title}: ${c.outcome || "unknown"} (score: ${c.score || "N/A"})${c.summary ? ` — ${c.summary.slice(0, 100)}` : ""}\n`;
    }

    // Document titles for context on what the team is working on
    activitySummary += `\n## All Documents\n`;
    for (const d of allDocs.slice(0, 50)) {
      activitySummary += `- ${d.title || "Untitled"} (created: ${d.createdAt.toISOString().slice(0, 10)}, updated: ${d.updatedAt.toISOString().slice(0, 10)})\n`;
    }

    activitySummary += githubContext;

    // Agent analysis prompt
    const completion = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "system",
          content: `You are a strategic AI analyst for a workspace management platform. You analyze team activity to provide actionable insights. Respond ONLY with valid JSON matching the exact schema below. No markdown, no code fences.

Schema:
{
  "signalNoise": {
    "overall": { "signal": <0-100>, "noise": <0-100>, "summary": "<1 sentence>" },
    "members": [
      { "name": "<member name>", "signal": <0-100>, "noise": <0-100>, "insight": "<1 sentence about their productivity pattern>" }
    ],
    "categories": [
      { "category": "<Documentation|Calls|AI Breakouts|Code>", "signal": <0-100>, "noise": <0-100> }
    ]
  },
  "visionTracker": {
    "shortTerm": { "score": <0-100>, "label": "<what the team is focused on now>", "items": ["<specific short-term task/focus 1>", "<2>", "<3>"] },
    "longTerm": { "score": <0-100>, "label": "<strategic direction>", "items": ["<long-term goal 1>", "<2>", "<3>"] },
    "alignment": <0-100>,
    "insight": "<2 sentences on how well short-term work maps to long-term vision>"
  },
  "workflowLog": [
    { "date": "<YYYY-MM-DD>", "author": "<name>", "type": "<commit|doc|breakout|call>", "summary": "<what they did>", "impact": "<high|medium|low>" }
  ],
  "recommendations": ["<actionable recommendation 1>", "<2>", "<3>"]
}

Signal = productive, goal-aligned work that moves things forward.
Noise = unfocused activity, rework, low-impact tasks, or stagnation.

For the workflowLog, combine GitHub commits, document activity, breakouts, and calls into a unified timeline of the most significant 15-20 events, sorted by date desc.

Be specific and data-driven. Reference actual document titles, commit messages, and call outcomes.`,
        },
        {
          role: "user",
          content: activitySummary,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let insights;
    try {
      // Strip potential markdown code fences
      const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI insights:", raw);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Save the report
    await db.agentReport.create({
      data: {
        workspaceId,
        type: "insights",
        payload: insights,
        createdBy: userId,
      },
    });

    return NextResponse.json(insights);
  } catch (err) {
    console.error("POST /api/overview/insights error:", err);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

/**
 * GET /api/overview/insights?workspaceId=...
 * Returns the most recent cached insights report.
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

    const report = await db.agentReport.findFirst({
      where: { workspaceId, type: "insights" },
      orderBy: { createdAt: "desc" },
      select: { payload: true, createdAt: true },
    });

    if (!report) {
      return NextResponse.json({ empty: true });
    }

    return NextResponse.json({
      ...(report.payload as object),
      generatedAt: report.createdAt,
    });
  } catch (err) {
    console.error("GET /api/overview/insights error:", err);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
