import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return workspaces the user owns OR that belong to their active org
    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          ...(orgId ? [{ orgId }] : []),
        ],
      },
      select: { id: true, name: true, slug: true, orgId: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(workspaces);
  } catch (err: any) {
    console.error("GET /api/workspaces error:", err);
    return NextResponse.json(
      { error: "Failed to fetch workspaces", detail: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    // Deduplicate slug
    let finalSlug = slug;
    const existing = await db.workspace.findUnique({ where: { slug } });
    if (existing) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const workspace = await db.workspace.create({
      data: {
        name,
        slug: finalSlug,
        ownerId: userId,
        orgId: orgId ?? null,
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/workspaces error:", err);
    return NextResponse.json(
      { error: "Failed to create workspace", detail: err?.message },
      { status: 500 }
    );
  }
}
