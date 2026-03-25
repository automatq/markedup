import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const backlinks = await db.node.findMany({
      where: { targetDocumentId: documentId },
      include: {
        sourceDocument: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(backlinks);
  } catch (err) {
    console.error("GET /api/backlinks error:", err);
    return NextResponse.json({ error: "Failed to fetch backlinks" }, { status: 500 });
  }
}
