import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";
import { getTrainingContext } from "@/lib/agent-training";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { agentId, message, documentContent, history, workspaceId } = await request.json();

    // Look up agent and verify workspace access
    const agent = await db.agentConfig.findFirst({
      where: { id: agentId },
    });
    if (!agent) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    // Verify user can access the workspace this agent belongs to
    if (!(await canAccessWorkspace(agent.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Inject training material into system prompt
    const trainingContext = await getTrainingContext(agent.id);

    let systemPrompt = agent.systemPrompt + trainingContext;
    if (documentContent) {
      systemPrompt += `\n\nHere is the current document content for context:\n\n${documentContent}`;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages,
    });

    const text = response.choices[0]?.message?.content || "";

    return NextResponse.json({
      response: text,
      agentId: agent.roleId,
      agentName: agent.name,
      agentTitle: agent.title,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Agent API error:", errorMessage, err);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
