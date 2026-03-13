import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const documents = await db.document.findMany({
      where: { workspaceId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err) {
    console.error("GET /api/documents error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, title } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const document = await db.document.create({
      data: {
        workspaceId,
        title: title ?? "Untitled",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
