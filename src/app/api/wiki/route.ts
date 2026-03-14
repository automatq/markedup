import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { AGENTS } from "@/lib/agents";

/**
 * GET /api/wiki?workspaceId=...
 * Returns a top-down business overview:
 * - Document count, breakout count, recent activity
 * - Per-agent summary with latest breakout highlights
 * - AI-generated org chart (Mermaid) and key advice
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

    // Verify access
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          ...(orgId ? [{ orgId, isPersonal: false }] : []),
        ],
      },
      select: { id: true, name: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Gather data
    const [documents, breakouts, recentDocs] = await Promise.all([
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.breakout.findMany({
        where: { document: { workspaceId, deletedAt: null } },
        select: {
          id: true,
          agentId: true,
          agentName: true,
          content: true,
          createdAt: true,
          document: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    // Build per-agent summaries
    const agentSummaries = AGENTS.map((agent) => {
      const agentBreakouts = breakouts.filter((b) => b.agentId === agent.id);
      const latest = agentBreakouts[0];
      return {
        id: agent.id,
        name: agent.name,
        title: agent.title,
        color: agent.color,
        avatar: agent.avatar,
        breakoutCount: agentBreakouts.length,
        latestBreakout: latest
          ? {
              id: latest.id,
              documentTitle: latest.document.title,
              preview: latest.content.slice(0, 300),
              createdAt: latest.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      workspace: workspace,
      stats: {
        documentCount: documents.length,
        breakoutCount: breakouts.length,
        agentCount: AGENTS.length,
      },
      recentDocuments: recentDocs,
      agentSummaries,
    });
  } catch (err) {
    console.error("GET /api/wiki error:", err);
    return NextResponse.json({ error: "Failed to load wiki data" }, { status: 500 });
  }
}

/**
 * POST /api/wiki
 * Generate AI-powered business overview with Mermaid diagram + key advice.
 * Body: { workspaceId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
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

    // Gather all documents and breakouts
    const [documents, breakouts, workspace] = await Promise.all([
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, title: true, content: true },
      }),
      db.breakout.findMany({
        where: { document: { workspaceId, deletedAt: null } },
        select: { agentId: true, agentName: true, content: true, document: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 20, // Limit to most recent
      }),
      db.workspace.findFirst({
        where: { id: workspaceId },
        select: { name: true },
      }),
    ]);

    // Build context for AI
    const docSummaries = documents.map((d) => `- "${d.title}"`).join("\n");
    const breakoutSummaries = breakouts
      .map((b) => `[${b.agentName} on "${b.document.title}"]: ${b.content.slice(0, 200)}`)
      .join("\n\n");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "system",
          content: `You are a strategic business advisor creating a top-down overview of a company's operations. You have access to the company's documents and AI agent breakout files (role-specific action plans from CEO, CRO, and CTO perspectives).

Your job is to produce TWO things:

1. A **Mermaid.js diagram** that visualizes the organizational structure, key initiatives, and how they connect. Use a flowchart (graph TD) or mindmap. Keep it clean and readable. Include the CEO, CRO, CTO roles and their key focus areas based on the breakout files. Connect documents to the relevant roles.

2. **Key advice** — a concise, prioritized list of strategic recommendations for each role (CEO, CRO, CTO) based on what you see across all documents and breakouts. Be specific, actionable, and reference the actual documents.

Format your response EXACTLY like this (the markers are important for parsing):

---MERMAID---
graph TD
  ... your diagram here ...
---END_MERMAID---

---ADVICE---
## CEO — Dylan
- advice 1
- advice 2

## CRO — Luke
- advice 1
- advice 2

## CTO — Chris
- advice 1
- advice 2

## Cross-Functional
- advice that applies to multiple roles
---END_ADVICE---`,
        },
        {
          role: "user",
          content: `Company: ${workspace?.name || "Unknown"}

Documents (${documents.length}):
${docSummaries || "(no documents yet)"}

Recent Agent Breakout Summaries:
${breakoutSummaries || "(no breakout files yet)"}

Generate the Mermaid org chart and key advice based on this data.`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";

    // Parse response
    const mermaidMatch = raw.match(/---MERMAID---\s*([\s\S]*?)\s*---END_MERMAID---/);
    const adviceMatch = raw.match(/---ADVICE---\s*([\s\S]*?)\s*---END_ADVICE---/);

    return NextResponse.json({
      mermaidChart: mermaidMatch?.[1]?.trim() || "",
      advice: adviceMatch?.[1]?.trim() || raw,
      raw,
    });
  } catch (err) {
    console.error("POST /api/wiki error:", err);
    return NextResponse.json({ error: "Failed to generate wiki overview" }, { status: 500 });
  }
}
