import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * POST /api/breakouts/save
 * Save a breakout file as a document in the user's personal workspace.
 * Body: { breakoutId } or { title, content } (markdown string)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { breakoutId, title: rawTitle, content: rawContent } = body;

    let title: string;
    let markdownContent: string;

    if (breakoutId) {
      // Look up breakout
      const breakout = await db.breakout.findUnique({ where: { id: breakoutId } });
      if (!breakout) {
        return NextResponse.json({ error: "Breakout not found" }, { status: 404 });
      }
      title = `Breakout: ${breakout.agentName}`;
      markdownContent = breakout.content;
    } else if (rawTitle && rawContent) {
      title = rawTitle;
      markdownContent = rawContent;
    } else {
      return NextResponse.json({ error: "breakoutId or title+content required" }, { status: 400 });
    }

    // Find or create the user's personal workspace
    let personalWs = await db.workspace.findFirst({
      where: { ownerId: userId, isPersonal: true },
    });

    if (!personalWs) {
      personalWs = await db.workspace.create({
        data: {
          name: "My Space",
          slug: `personal-${userId}-${Date.now()}`,
          ownerId: userId,
          orgId: null,
          isPersonal: true,
        },
      });
    }

    // Create a document with the breakout markdown as simple paragraph content
    // We store the markdown in a single paragraph — the editor will render it
    const tiptapContent = {
      type: "doc",
      content: markdownContent.split("\n").map((line: string) =>
        line.trim()
          ? { type: "paragraph", content: [{ type: "text", text: line }] }
          : { type: "paragraph" }
      ),
    };

    const document = await db.document.create({
      data: {
        workspaceId: personalWs.id,
        title,
        content: tiptapContent,
      },
    });

    return NextResponse.json({
      document,
      workspaceId: personalWs.id,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/breakouts/save error:", err);
    return NextResponse.json({ error: "Failed to save breakout" }, { status: 500 });
  }
}
