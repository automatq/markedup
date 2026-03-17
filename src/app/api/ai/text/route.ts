import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const SYSTEM_PROMPTS: Record<string, string> = {
  improve:
    "Rewrite the following text for clarity, grammar, and flow. Maintain the original meaning and tone. Return only the rewritten text, no preamble or explanation.",
  "fix-spelling":
    "Fix all spelling, grammar, and punctuation errors in the following text. Make minimal changes — only correct errors. Return only the corrected text.",
  shorter:
    "Condense the following text while preserving its core meaning. Remove redundancy and tighten the language. Return only the shortened text.",
  longer:
    "Expand the following text with more detail, examples, or supporting points. Maintain the original tone. Return only the expanded text.",
  professional:
    "Rewrite the following text in a professional, formal tone suitable for business communication. Return only the rewritten text.",
  casual:
    "Rewrite the following text in a casual, conversational tone. Return only the rewritten text.",
  friendly:
    "Rewrite the following text in a warm, friendly, approachable tone. Return only the rewritten text.",
  direct:
    "Rewrite the following text to be more direct and concise. Remove hedging and filler. Return only the rewritten text.",
  summarize:
    "Summarize the following text in 1-3 sentences capturing the key points. Return only the summary.",
  explain:
    "Explain the following text in simpler terms that anyone could understand. Return only the explanation.",
  "action-items":
    "Extract all action items, tasks, and commitments from the following text. Return as a bulleted list. If none found, say 'No action items found.'",
};

/**
 * POST /api/ai/text
 * Streaming AI text transformation endpoint.
 * Body: { text: string, action: string, customPrompt?: string, targetLang?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500 });
    }

    const { text, action, customPrompt, targetLang } = await request.json();

    if (!text || !action) {
      return new Response(JSON.stringify({ error: "text and action required" }), { status: 400 });
    }

    let systemPrompt: string;

    if (action === "custom" && customPrompt) {
      systemPrompt = `Follow the user's instruction exactly. Apply it to the text they provide. Return only the result, no preamble.\n\nInstruction: ${customPrompt}`;
    } else if (action.startsWith("translate-") || action === "translate") {
      const lang = targetLang || action.replace("translate-", "") || "Spanish";
      systemPrompt = `Translate the following text to ${lang}. Return only the translation, no preamble.`;
    } else {
      systemPrompt = SYSTEM_PROMPTS[action];
      if (!systemPrompt) {
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Convert OpenAI stream to web ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("POST /api/ai/text error:", err);
    return new Response(JSON.stringify({ error: "Failed to process text" }), { status: 500 });
  }
}
