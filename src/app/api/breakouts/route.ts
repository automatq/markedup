import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import type { AgentRole } from "@/lib/agents";
import { canAccessDocument, canAccessWorkspace } from "@/lib/auth";
import { getTrainingContext } from "@/lib/agent-training";

/**
 * GET /api/breakouts?documentId=...
 * Returns all breakout files for a document.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    if (!(await canAccessDocument(documentId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const breakouts = await db.breakout.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(breakouts);
  } catch (err) {
    console.error("GET /api/breakouts error:", err);
    return NextResponse.json({ error: "Failed to fetch breakouts" }, { status: 500 });
  }
}

/**
 * POST /api/breakouts
 * Generate a new breakout file for a document using an AI agent.
 * Body: { documentId, agentId, documentContent, documentTitle }
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

    const { documentId, agentId, documentContent, documentTitle } = await request.json();

    if (!documentId || !agentId) {
      return NextResponse.json({ error: "documentId and agentId required" }, { status: 400 });
    }

    if (!(await canAccessDocument(documentId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up agent from DB and verify it belongs to the same workspace
    const agentConfig = await db.agentConfig.findUnique({ where: { id: agentId } });
    if (!agentConfig) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }
    const agent: AgentRole = {
      id: agentConfig.roleId,
      name: agentConfig.name,
      title: agentConfig.title,
      color: agentConfig.color,
      avatar: agentConfig.avatar,
      description: agentConfig.description,
      systemPrompt: agentConfig.systemPrompt,
    };

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Inject training material
    const trainingContext = await getTrainingContext(agentConfig.id);

    const systemPrompt = `${agent.systemPrompt}${trainingContext}

You are creating a BREAKOUT ACTION FILE for this document. This is a focused, actionable companion document that helps the person assigned to your role (${agent.title}) understand:

1. **Context** — What this document means from your role's perspective
2. **Key Takeaways** — The most important points relevant to your domain
3. **Action Items** — Specific, prioritized steps the ${agent.title} should take
4. **Risks & Blockers** — What could go wrong from your perspective
5. **Questions to Resolve** — Open questions that need answers before proceeding
6. **Success Metrics** — How to measure if the actions were effective

Format the output as clean Markdown. Be specific, direct, and actionable. Reference specific parts of the source document. This breakout file will be visible to the entire team, so be professional but candid.`;

    const userPrompt = `Generate a ${agent.title} breakout action file for this document:

**Document Title:** ${documentTitle || "Untitled"}

**Document Content:**
${documentContent || "(empty document)"}`;

    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || "";

    const breakout = await db.breakout.create({
      data: {
        documentId,
        agentId: agent.id,
        agentName: `${agent.name} (${agent.title})`,
        content,
        createdBy: userId,
      },
    });

    // Auto-save to personal workspace if the user has it enabled
    try {
      const personalWs = await db.workspace.findFirst({
        where: { ownerId: userId, isPersonal: true, autoBreakouts: true },
      });
      if (personalWs) {
        const tiptapContent = {
          type: "doc",
          content: content.split("\n").map((line: string) =>
            line.trim()
              ? { type: "paragraph", content: [{ type: "text", text: line }] }
              : { type: "paragraph" }
          ),
        };
        await db.document.create({
          data: {
            workspaceId: personalWs.id,
            title: `Breakout: ${agent.name} (${agent.title}) — ${documentTitle || "Untitled"}`,
            content: tiptapContent,
          },
        });
      }
    } catch (autoSaveErr) {
      // Non-fatal — breakout was still created
      console.error("Auto-save breakout to personal workspace failed:", autoSaveErr);
    }

    return NextResponse.json(breakout, { status: 201 });
  } catch (err) {
    console.error("POST /api/breakouts error:", err);
    return NextResponse.json({ error: "Failed to generate breakout" }, { status: 500 });
  }
}

/**
 * DELETE /api/breakouts?id=...
 * Delete a specific breakout file.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Verify the breakout's document belongs to a workspace the user can access
    const breakout = await db.breakout.findUnique({
      where: { id },
      select: { document: { select: { workspaceId: true } } },
    });
    if (!breakout) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(breakout.document.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.breakout.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/breakouts error:", err);
    return NextResponse.json({ error: "Failed to delete breakout" }, { status: 500 });
  }
}
