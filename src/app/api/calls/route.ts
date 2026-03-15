import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { toFile } from "openai";
import { canAccessWorkspace } from "@/lib/auth";

export const runtime = "nodejs";

// Increase body size limit for audio uploads
export const maxDuration = 120; // 2 min timeout for long transcriptions

/**
 * GET /api/calls?workspaceId=...
 * List call logs for a workspace.
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

    const calls = await db.callLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(calls);
  } catch (err) {
    console.error("GET /api/calls error:", err);
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 });
  }
}

/**
 * POST /api/calls
 * Upload audio → Whisper transcription → AI analysis → save call log.
 * Accepts multipart/form-data with:
 * - audio: File (mp3, wav, m4a, webm, mp4, ogg)
 * - workspaceId: string
 * - title: string (optional, defaults to "Call Recording")
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

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const workspaceId = formData.get("workspaceId") as string;
    const title = (formData.get("title") as string) || "Call Recording";

    if (!audioFile) {
      return NextResponse.json({ error: "audio file required" }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. Transcribe with Whisper
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = await toFile(buffer, audioFile.name || "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
    });

    const transcript = transcription.text || "";
    const durationSecs = Math.round(transcription.duration ?? 0);

    // 2. AI analysis of the call
    const analysisResponse = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "system",
          content: `You are a call analysis expert. Analyze this call transcript and extract:

1. **Summary** — A concise 2-4 sentence summary of the call
2. **Action Items** — Specific follow-up tasks (bulleted list)
3. **Outcome** — One of: "positive", "neutral", "negative" (based on whether the call achieved its goals)
4. **Score** — A success score from 0-100 based on:
   - Did the call achieve its objective? (40 pts)
   - Was the conversation productive? (20 pts)
   - Were next steps established? (20 pts)
   - Was rapport maintained? (20 pts)
5. **Tags** — 2-5 relevant tags (comma-separated, e.g. "sales,follow-up,demo")

Format your response EXACTLY like this:

---SUMMARY---
Your summary here
---END_SUMMARY---

---ACTION_ITEMS---
- Action item 1
- Action item 2
---END_ACTION_ITEMS---

---OUTCOME---
positive
---END_OUTCOME---

---SCORE---
75
---END_SCORE---

---TAGS---
sales,discovery,qualified
---END_TAGS---`,
        },
        {
          role: "user",
          content: `Call title: ${title}\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    const analysis = analysisResponse.choices[0]?.message?.content || "";

    // Parse analysis
    const summaryMatch = analysis.match(/---SUMMARY---\s*([\s\S]*?)\s*---END_SUMMARY---/);
    const actionMatch = analysis.match(/---ACTION_ITEMS---\s*([\s\S]*?)\s*---END_ACTION_ITEMS---/);
    const outcomeMatch = analysis.match(/---OUTCOME---\s*([\s\S]*?)\s*---END_OUTCOME---/);
    const scoreMatch = analysis.match(/---SCORE---\s*(\d+)\s*---END_SCORE---/);
    const tagsMatch = analysis.match(/---TAGS---\s*([\s\S]*?)\s*---END_TAGS---/);

    const summary = summaryMatch?.[1]?.trim() || "";
    const actionItems = actionMatch?.[1]?.trim() || "";
    const outcome = outcomeMatch?.[1]?.trim() || "neutral";
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    const tags = tagsMatch?.[1]?.trim() || "";

    // 3. Save to database
    const callLog = await db.callLog.create({
      data: {
        workspaceId,
        title,
        transcript,
        summary,
        actionItems,
        outcome,
        score,
        durationSecs,
        tags,
        createdBy: userId,
      },
    });

    return NextResponse.json(callLog, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/calls error:", err);
    return NextResponse.json(
      { error: "Failed to process call", detail: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calls?id=...
 * Delete a call log.
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

    // Verify the call belongs to a workspace the user can access
    const call = await db.callLog.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!call) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(call.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.callLog.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/calls error:", err);
    return NextResponse.json({ error: "Failed to delete call" }, { status: 500 });
  }
}
