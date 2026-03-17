import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/agents/watchers?workspaceId=...&documentId=...
 * Returns all watchers, optionally filtered by document.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const watchers = await db.documentWatcher.findMany({
      where: {
        workspaceId,
        ...(documentId && { documentId }),
      },
      include: {
        agentConfig: { select: { id: true, name: true, title: true, color: true, roleId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ watchers });
  } catch (err) {
    console.error("GET /api/agents/watchers error:", err);
    return NextResponse.json({ error: "Failed to load watchers" }, { status: 500 });
  }
}

/**
 * POST /api/agents/watchers
 * Assign an agent to watch a document.
 * Body: { workspaceId, documentId, agentConfigId, watchFor? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, documentId, agentConfigId, watchFor } = await request.json();
    if (!workspaceId || !documentId || !agentConfigId) {
      return NextResponse.json({ error: "workspaceId, documentId, agentConfigId required" }, { status: 400 });
    }
    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const watcher = await db.documentWatcher.upsert({
      where: { documentId_agentConfigId: { documentId, agentConfigId } },
      create: {
        workspaceId,
        documentId,
        agentConfigId,
        watchFor: watchFor || ["changes", "action-items", "risks"],
        createdBy: userId,
      },
      update: {
        enabled: true,
        watchFor: watchFor || undefined,
      },
      include: {
        agentConfig: { select: { id: true, name: true, title: true, color: true, roleId: true } },
      },
    });

    return NextResponse.json(watcher);
  } catch (err) {
    console.error("POST /api/agents/watchers error:", err);
    return NextResponse.json({ error: "Failed to create watcher" }, { status: 500 });
  }
}

/**
 * POST /api/agents/watchers/analyze
 * Trigger an agent to analyze a document it's watching.
 * Body: { watcherId, documentContent, documentTitle }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    const { watcherId, documentContent, documentTitle } = await request.json();
    if (!watcherId || !documentContent) {
      return NextResponse.json({ error: "watcherId and documentContent required" }, { status: 400 });
    }

    const watcher = await db.documentWatcher.findUnique({
      where: { id: watcherId },
      include: { agentConfig: true },
    });
    if (!watcher || !watcher.agentConfig) {
      return NextResponse.json({ error: "Watcher not found" }, { status: 404 });
    }

    const watchFor = (Array.isArray(watcher.watchFor) ? watcher.watchFor : ["changes", "action-items", "risks"]) as string[];
    const agent = watcher.agentConfig;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${agent.name}, the ${agent.title}. ${agent.systemPrompt}

You are WATCHING this document and need to provide a focused analysis. Respond ONLY with valid JSON:

{
  "summary": "<1-2 sentence overview of the document from your role's perspective>",
  "alerts": [
    { "level": "info|warning|critical", "message": "<what you noticed>" }
  ],
  ${watchFor.includes("action-items") ? '"actionItems": [ { "title": "<action>", "priority": "low|medium|high|urgent", "assignee": "<suggested person or role>" } ],' : ""}
  ${watchFor.includes("risks") ? '"risks": [ { "risk": "<what could go wrong>", "impact": "low|medium|high", "mitigation": "<suggested fix>" } ],' : ""}
  ${watchFor.includes("changes") ? '"suggestions": [ "<improvement suggestion from your perspective>" ],' : ""}
  "keyInsight": "<the single most important thing you noticed>",
  "score": <0-100 relevance/quality score from your role's perspective>
}`,
        },
        {
          role: "user",
          content: `Document: "${documentTitle}"\n\n${documentContent}`,
        },
      ],
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let analysis;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { summary: "Failed to parse analysis", alerts: [], keyInsight: raw.slice(0, 200) };
    }

    // Update watcher with latest analysis
    await db.documentWatcher.update({
      where: { id: watcherId },
      data: {
        lastAnalysis: analysis,
        lastAnalyzedAt: new Date(),
      },
    });

    // Also save as an agent report
    await db.agentReport.create({
      data: {
        workspaceId: watcher.workspaceId,
        agentId: watcher.agentConfigId,
        type: "document_watch",
        payload: { documentId: watcher.documentId, documentTitle, ...analysis },
        createdBy: userId,
      },
    });

    // Auto-extract action items if the agent found any
    if (analysis.actionItems?.length > 0) {
      await db.actionItem.createMany({
        data: analysis.actionItems.map((item: any) => ({
          workspaceId: watcher.workspaceId,
          title: item.title,
          priority: item.priority || "medium",
          sourceType: "agent_report",
          sourceId: watcher.documentId,
          sourceTitle: `${agent.name} watching "${documentTitle}"`,
          createdBy: "system",
        })),
      });
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("PATCH /api/agents/watchers error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/watchers?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.documentWatcher.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/agents/watchers error:", err);
    return NextResponse.json({ error: "Failed to delete watcher" }, { status: 500 });
  }
}
