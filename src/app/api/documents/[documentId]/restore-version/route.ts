import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";

function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY not set");
  return new Liveblocks({ secret });
}

/**
 * POST /api/documents/[documentId]/restore-version
 * Restores a Liveblocks Yjs history version by fetching the version's
 * Yjs binary via the REST API and sending it as an update to the current room.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;
    const { roomId, createdAt } = await request.json();

    if (!roomId || !createdAt) {
      return NextResponse.json({ error: "roomId and createdAt required" }, { status: 400 });
    }

    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Liveblocks not configured" }, { status: 500 });
    }

    // Fetch the Yjs binary at a specific version date via the REST API
    // The SDK doesn't expose the versionDate param, so we call the API directly
    const versionDate = new Date(createdAt).toISOString();
    const url = `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}/ydoc/binary?versionDate=${encodeURIComponent(versionDate)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to fetch version binary:", res.status, errText);
      return NextResponse.json({ error: "Failed to fetch version" }, { status: 502 });
    }

    const yjsUpdate = new Uint8Array(await res.arrayBuffer());

    // Send the old version as a new update to restore it
    const liveblocks = getLiveblocks();
    await liveblocks.sendYjsBinaryUpdate(roomId, yjsUpdate);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/documents/[documentId]/restore-version error:", err);
    return NextResponse.json(
      { error: "Failed to restore version", detail: err?.message },
      { status: 500 }
    );
  }
}
