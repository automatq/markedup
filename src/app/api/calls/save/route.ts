import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * POST /api/calls/save
 * Save a call log as a markdown document in the workspace.
 * Body: { callId, workspaceId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, workspaceId } = await request.json();
    if (!callId || !workspaceId) {
      return NextResponse.json({ error: "callId and workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const call = await db.callLog.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Build document content
    const lines: string[] = [];
    lines.push(`# Call Notes: ${call.title}`);
    lines.push("");
    lines.push(`**Date:** ${call.createdAt.toLocaleDateString()}`);
    if (call.durationSecs) {
      const mins = Math.floor(call.durationSecs / 60);
      const secs = call.durationSecs % 60;
      lines.push(`**Duration:** ${mins}m ${secs}s`);
    }
    if (call.outcome) {
      const emoji = call.outcome === "positive" ? "✅" : call.outcome === "negative" ? "❌" : "➖";
      lines.push(`**Outcome:** ${emoji} ${call.outcome}`);
    }
    if (call.score !== null) {
      lines.push(`**Score:** ${call.score}/100`);
    }
    if (call.tags) {
      lines.push(`**Tags:** ${call.tags}`);
    }

    lines.push("");
    lines.push("## Summary");
    lines.push(call.summary || "(no summary)");
    lines.push("");
    lines.push("## Action Items");
    lines.push(call.actionItems || "(none)");
    lines.push("");
    lines.push("## Transcript");
    lines.push(call.transcript);

    const tiptapContent = {
      type: "doc",
      content: lines.map((line) =>
        line.trim()
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" }
      ),
    };

    const document = await db.document.create({
      data: {
        workspaceId,
        title: `Call: ${call.title}`,
        content: tiptapContent,
      },
    });

    // Link the call log to the document
    await db.callLog.update({
      where: { id: callId },
      data: { documentId: document.id },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("POST /api/calls/save error:", err);
    return NextResponse.json({ error: "Failed to save call as document" }, { status: 500 });
  }
}
