import { Liveblocks } from "@liveblocks/node";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const name = user
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Anonymous"
      : "Anonymous";
    const avatar = user?.imageUrl;
    const color =
      (user?.unsafeMetadata?.avatarColor as string) ?? "#6366f1";

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name,
        avatar,
        color,
      },
    });

    // Grant access to all document rooms for authenticated users.
    // Document-level access is enforced at the API layer (/api/documents).
    // TODO: For stricter isolation, scope to specific document IDs per workspace
    // and re-authenticate when new documents are created.
    session.allow("document:*", session.FULL_ACCESS);

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
