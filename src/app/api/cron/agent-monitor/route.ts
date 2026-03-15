import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/lib/db";

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  realtime: 60 * 60 * 1000, // hourly for "realtime"
};

/**
 * GET /api/cron/agent-monitor
 * Vercel Cron handler — runs on schedule to process all enabled agent monitors.
 * For each monitor whose frequency window has elapsed, generates fresh insights.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized invocations
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const now = new Date();

  // Find all enabled monitors that are due for a run
  const monitors = await db.agentMonitor.findMany({
    where: { enabled: true },
  });

  const results: { workspaceId: string; agentConfigId: string; status: string }[] = [];

  for (const monitor of monitors) {
    const intervalMs = FREQUENCY_MS[monitor.frequency] ?? FREQUENCY_MS.weekly;
    const lastRun = monitor.lastRunAt ? new Date(monitor.lastRunAt).getTime() : 0;

    if (now.getTime() - lastRun < intervalMs) {
      results.push({ workspaceId: monitor.workspaceId, agentConfigId: monitor.agentConfigId, status: "skipped_not_due" });
      continue;
    }

    try {
      await generateMonitorReport(openai, monitor, now);
      results.push({ workspaceId: monitor.workspaceId, agentConfigId: monitor.agentConfigId, status: "success" });
    } catch (err) {
      console.error(`Agent monitor failed for ${monitor.id}:`, err);
      results.push({ workspaceId: monitor.workspaceId, agentConfigId: monitor.agentConfigId, status: "error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

async function generateMonitorReport(
  openai: OpenAI,
  monitor: { id: string; workspaceId: string; agentConfigId: string; watchList: unknown },
  now: Date
) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const watchList = (Array.isArray(monitor.watchList) ? monitor.watchList : []) as string[];

  // Fetch agent config for context
  const agentConfig = await db.agentConfig.findUnique({
    where: { id: monitor.agentConfigId },
    select: { roleId: true, name: true, title: true, systemPrompt: true },
  });

  if (!agentConfig) return;

  // Build data context based on watchList
  let context = `# Agent Monitor Report\nAgent: ${agentConfig.name} (${agentConfig.title})\nRole: ${agentConfig.roleId}\nDate: ${now.toISOString().slice(0, 10)}\n\n`;

  if (watchList.includes("docs")) {
    const docs = await db.document.findMany({
      where: { workspaceId: monitor.workspaceId, deletedAt: null, updatedAt: { gte: sevenDaysAgo } },
      select: { title: true, createdBy: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    context += `## Documents Active This Week (${docs.length})\n`;
    for (const d of docs) {
      context += `- ${d.title || "Untitled"} (updated: ${d.updatedAt.toISOString().slice(0, 10)})\n`;
    }
  }

  if (watchList.includes("calls")) {
    const calls = await db.callLog.findMany({
      where: { workspaceId: monitor.workspaceId, createdAt: { gte: thirtyDaysAgo } },
      select: { title: true, outcome: true, score: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    context += `\n## Calls (Last 30 Days: ${calls.length})\n`;
    for (const c of calls) {
      context += `- ${c.title}: ${c.outcome || "unknown"} (score: ${c.score ?? "N/A"}) [${c.createdAt.toISOString().slice(0, 10)}]\n`;
    }
  }

  if (watchList.includes("github")) {
    const integrations = await db.workspaceIntegration.findMany({
      where: { workspaceId: monitor.workspaceId, type: "github" },
    });
    const ghResults = await Promise.all(
      integrations.map(async (integration) => {
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
          const res = await fetch(
            `https://api.github.com/repos/${config.owner}/${config.repo}/commits?since=${sevenDaysAgo.toISOString()}&per_page=30`,
            { headers }
          );
          if (res.ok) return { config, commits: await res.json() };
        } catch {}
        return null;
      })
    );
    for (const result of ghResults) {
      if (!result) continue;
      context += `\n## GitHub (${result.config.owner}/${result.config.repo}) — ${result.commits.length} commits this week\n`;
      for (const c of result.commits.slice(0, 20)) {
        const author = c.commit?.author?.name || "Unknown";
        const date = c.commit?.author?.date?.slice(0, 10) || "";
        const msg = c.commit?.message?.split("\n")[0] || "";
        context += `- [${date}] ${author}: ${msg}\n`;
      }
    }
  }

  if (watchList.includes("kpis")) {
    const kpis = await db.kpi.findMany({
      where: { workspaceId: monitor.workspaceId },
      orderBy: { week: "desc" },
      take: 20,
    });
    if (kpis.length > 0) {
      context += `\n## KPIs\n`;
      for (const k of kpis) {
        const pct = k.target > 0 ? Math.round((k.actual / k.target) * 100) : 0;
        context += `- ${k.name}: ${k.actual}/${k.target} ${k.unit} (${pct}%) [${k.week}]\n`;
      }
    }
  }

  // Generate analysis
  const completion = await openai.chat.completions.create({
    model: "o4-mini",
    messages: [
      {
        role: "system",
        content: `You are ${agentConfig.name}, the ${agentConfig.title} AI agent. Analyze the workspace data from your role's perspective and generate a monitoring digest. Respond ONLY with valid JSON matching this schema:

{
  "summary": "<2-3 sentence executive summary from your role's perspective>",
  "alerts": [
    { "level": "<info|warning|critical>", "message": "<what you noticed>" }
  ],
  "metrics": {
    "activityScore": <0-100>,
    "trendDirection": "<up|down|flat>",
    "keyInsight": "<most important finding>"
  },
  "recommendations": ["<1>", "<2>", "<3>"]
}

${agentConfig.systemPrompt}`,
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
    console.error(`Failed to parse monitor response for ${monitor.id}:`, raw);
    payload = { error: "Failed to parse AI response", raw: raw.slice(0, 500) };
  }

  // Save report and update lastRunAt in parallel
  await Promise.all([
    db.agentReport.create({
      data: {
        workspaceId: monitor.workspaceId,
        agentId: monitor.agentConfigId,
        type: "monitor_digest",
        payload,
        createdBy: "system",
      },
    }),
    db.agentMonitor.update({
      where: { id: monitor.id },
      data: { lastRunAt: now },
    }),
  ]);
}
