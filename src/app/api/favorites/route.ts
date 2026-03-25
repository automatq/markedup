import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const favorites = await db.favorite.findMany({
      where: {
        userId,
        document: { workspaceId, deletedAt: null },
      },
      include: {
        document: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}
