import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const workspaces = await db.workspace.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(workspaces);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }

  const workspace = await db.workspace.create({
    data: { name, slug },
  });

  return NextResponse.json(workspace, { status: 201 });
}
