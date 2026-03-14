import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return workspaces the user owns OR org workspaces (excluding other users' personal ones)
    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId }, // All workspaces I own (including my personal)
          ...(orgId
            ? [{ orgId, isPersonal: false }] // Org workspaces that aren't someone's personal
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        orgId: true,
        isPersonal: true,
        ownerId: true,
        autoBreakouts: true,
      },
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
    const { name, slug, isPersonal } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    // Only one personal workspace per user
    if (isPersonal) {
      const existing = await db.workspace.findFirst({
        where: { ownerId: userId, isPersonal: true },
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
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
        orgId: isPersonal ? null : (orgId ?? null),
        isPersonal: isPersonal ?? false,
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

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, autoBreakouts } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const workspace = await db.workspace.findFirst({
      where: { id, ownerId: userId },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.workspace.update({
      where: { id },
      data: {
        ...(typeof autoBreakouts === "boolean" ? { autoBreakouts } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/workspaces error:", err);
    return NextResponse.json(
      { error: "Failed to update workspace", detail: err?.message },
      { status: 500 }
    );
  }
}
