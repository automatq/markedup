import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const workspaces = await db.workspace.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(workspaces);
  } catch (err) {
    console.error("GET /api/workspaces error:", err);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    // Deduplicate slug if it already exists
    let finalSlug = slug;
    const existing = await db.workspace.findUnique({ where: { slug } });
    if (existing) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const workspace = await db.workspace.create({
      data: { name, slug: finalSlug },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    console.error("POST /api/workspaces error:", err);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
