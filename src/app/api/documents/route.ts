import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Liveblocks } from "@liveblocks/node";
import { tiptapJsonToYjsUpdate } from "@/lib/yjs-init";

function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY not set");
  return new Liveblocks({ secret });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Batch lookup by IDs (used by resolveRoomsInfo for notifications)
    const ids = request.nextUrl.searchParams.get("ids");
    if (ids) {
      const idList = ids.split(",").filter(Boolean);
      const documents = await db.document.findMany({
        where: { id: { in: idList } },
        select: { id: true, title: true },
      });
      return NextResponse.json(documents);
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify user owns this workspace
    const workspace = await db.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const showTrash = request.nextUrl.searchParams.get("trash") === "true";

    const documents = await db.document.findMany({
      where: {
        workspaceId,
        deletedAt: showTrash ? { not: null } : null,
      },
      select: { id: true, title: true, updatedAt: true, deletedAt: true },
      orderBy: showTrash ? { deletedAt: "desc" } : { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err) {
    console.error("GET /api/documents error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, title, content } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify user owns this workspace
    const workspace = await db.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const document = await db.document.create({
      data: {
        workspaceId,
        title: title ?? "Untitled",
        content: content ?? undefined,
      },
    });

    // Pre-seed the Liveblocks room with template content so the Yjs document
    // already has content before any client connects — no client-side injection needed.
    if (content && content.type === "doc" && content.content?.length > 0) {
      try {
        const liveblocks = getLiveblocks();
        const roomId = `document:${document.id}`;

        // Ensure the room exists (Liveblocks creates it lazily on first connect,
        // but we need it now to send the Yjs update)
        try {
          await liveblocks.createRoom(roomId, { defaultAccesses: [] });
        } catch {
          // Room may already exist — that's fine
        }

        const update = tiptapJsonToYjsUpdate(content);
        await liveblocks.sendYjsBinaryUpdate(roomId, update);
      } catch (err) {
        // Non-fatal — the document is created, content just won't be pre-seeded.
        // The client-side fallback (initialContent on useLiveblocksExtension) may still work.
        console.error("Failed to pre-seed Liveblocks room:", err);
      }
    }

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
