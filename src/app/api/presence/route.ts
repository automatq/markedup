import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY not set");
  return new Liveblocks({ secret });
}

/**
 * GET /api/presence?documentIds=id1,id2,id3
 * Returns active users per document room.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentIds = request.nextUrl.searchParams.get("documentIds");
    if (!documentIds) {
      return NextResponse.json({ error: "documentIds required" }, { status: 400 });
    }

    const ids = documentIds.split(",").filter(Boolean);

    // Verify the user can access the workspace these documents belong to
    if (ids.length > 0) {
      const doc = await db.document.findFirst({
        where: { id: { in: ids } },
        select: { workspaceId: true },
      });
      if (doc && !(await canAccessWorkspace(doc.workspaceId, userId, orgId ?? null))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const liveblocks = getLiveblocks();

    // Fetch active users for each room in parallel
    const results: Record<string, { count: number; users: { name: string; avatar?: string; color: string }[] }> = {};

    await Promise.all(
      ids.map(async (docId) => {
        try {
          const room = await liveblocks.getRoom(`document:${docId}`);
          if (room) {
            const activeUsers = await liveblocks.getActiveUsers(`document:${docId}`);
            if (activeUsers.data.length > 0) {
              results[docId] = {
                count: activeUsers.data.length,
                users: activeUsers.data.map((u: any) => ({
                  name: u.info?.name || "Unknown",
                  avatar: u.info?.avatar,
                  color: u.info?.color || "#6366f1",
                })),
              };
            }
          }
        } catch {
          // Room might not exist yet — skip silently
        }
      })
    );

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("GET /api/presence error:", err);
    return NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 });
  }
}
