import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * POST /api/ai/ghost-writer
 * Ghost Writer — AI continues writing based on document content and workspace context.
 * Streams the response for real-time output.
 *
 * Body: { workspaceId, documentContent, cursorContext, instruction?, agentId? }
 * - documentContent: full document text
 * - cursorContext: the paragraph/section where the cursor is (for focused continuation)
 * - instruction: optional user instruction (e.g., "expand on this point")
 * - agentId: optional agent to use for role-specific writing style
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    if (!process.env.OPENAI_API_KEY) return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500 });

    const { workspaceId, documentContent, cursorContext, instruction, agentId } = await request.json();
    if (!workspaceId || !documentContent) {
      return new Response(JSON.stringify({ error: "workspaceId and documentContent required" }), { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    // Gather workspace context for smarter writing
    const [recentDocs, recentCalls, kpis, agent] = await Promise.all([
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { title: true },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
      db.callLog.findMany({
        where: { workspaceId },
        select: { title: true, outcome: true, summary: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.kpi.findMany({
        where: { workspaceId },
        orderBy: { week: "desc" },
        take: 10,
      }),
      agentId ? db.agentConfig.findUnique({ where: { id: agentId }, select: { name: true, title: true, systemPrompt: true } }) : null,
    ]);

    // Build workspace context summary
    let wsContext = "";
    if (recentDocs.length > 0) {
      wsContext += `\n\nWorkspace documents: ${recentDocs.map(d => d.title).join(", ")}`;
    }
    if (recentCalls.length > 0) {
      wsContext += `\n\nRecent calls: ${recentCalls.map(c => `${c.title} (${c.outcome}): ${c.summary?.slice(0, 80) || "no summary"}`).join("; ")}`;
    }
    if (kpis.length > 0) {
      wsContext += `\n\nKPIs: ${kpis.slice(0, 5).map(k => `${k.name}: ${k.actual}/${k.target} ${k.unit}`).join(", ")}`;
    }

    const agentPersonality = agent
      ? `You are ${agent.name}, the ${agent.title}. ${agent.systemPrompt}\n\n`
      : "";

    const systemPrompt = `${agentPersonality}You are a Ghost Writer — an AI that continues writing seamlessly in the user's document. Your job is to:

1. Read the full document context
2. Understand the writing style, tone, and structure
3. Continue writing from where the cursor is, maintaining perfect consistency
4. Use specific data from the workspace (calls, KPIs, other docs) when relevant
5. Write in the same voice as the rest of the document — match paragraph length, heading style, and formatting

${instruction ? `User instruction: ${instruction}` : "Continue writing the next logical section/paragraph."}

Return ONLY the new content to insert. No preamble, no "Here's what I'd write:", just the actual content. Use markdown formatting.${wsContext}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Full document:\n\n${documentContent}\n\n---\n\nCursor is at this section:\n\n${cursorContext || "(end of document)"}\n\nContinue writing from here.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("POST /api/ai/ghost-writer error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate" }), { status: 500 });
  }
}
