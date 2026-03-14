import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getAgent } from "@/lib/agents";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const { agentId, message, documentContent, history } = await request.json();

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const systemPrompt = documentContent
      ? `${agent.systemPrompt}\n\nHere is the current document content for context:\n\n${documentContent}`
      : agent.systemPrompt;

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
      agentId: agent.id,
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
