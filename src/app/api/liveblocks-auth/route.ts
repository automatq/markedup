import { Liveblocks } from "@liveblocks/node";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

let _liveblocks: Liveblocks | null = null;
function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY environment variable is not set");
  }
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({ secret });
  }
  return _liveblocks;
}

export async function POST() {
  try {
    const liveblocks = getLiveblocks();
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const name = user
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Anonymous"
      : "Anonymous";
    // Only pass avatar URL if user has a custom uploaded image
    const avatar = user?.hasImage ? user.imageUrl : undefined;
    const color =
      (user?.unsafeMetadata?.avatarColor as string) ?? "#6366f1";

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name,
        avatar,
        color,
      },
    });

    // Scope access to only documents in workspaces the user can access
    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          ...(orgId ? [{ orgId, isPersonal: false }] : []),
        ],
      },
      select: { id: true },
    });

    const wsIds = workspaces.map((w) => w.id);

    if (wsIds.length > 0) {
      // Get all document IDs in accessible workspaces
      const documents = await db.document.findMany({
        where: { workspaceId: { in: wsIds }, deletedAt: null },
        select: { id: true },
      });

      // Grant access to each document room individually
      for (const doc of documents) {
        session.allow(`document:${doc.id}`, session.FULL_ACCESS);
      }
    }

    const { status, body } = await session.authorize();

    return new Response(body, { status });
  } catch (err) {
    console.error("Liveblocks auth error:", err);
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
