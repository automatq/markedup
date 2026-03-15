import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessDocument } from "@/lib/auth";
import { resolveUsers } from "@/lib/clerk-users";

// POST — record that the current user viewed this document
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  if (!(await canAccessDocument(documentId, userId, orgId ?? null))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert so we only keep the latest view time per user
  const view = await db.documentView.upsert({
    where: { documentId_userId: { documentId, userId } },
    update: { viewedAt: new Date() },
    create: { documentId, userId },
  });

  return NextResponse.json(view);
}

// GET — list who has viewed this document
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  if (!(await canAccessDocument(documentId, userId, orgId ?? null))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const views = await db.documentView.findMany({
    where: { documentId },
    orderBy: { viewedAt: "desc" },
  });

  // Resolve user names/avatars from Clerk (batch fetch)
  const userMap = await resolveUsers(views.map((v) => v.userId));
  const enriched = views.map((v) => ({
    userId: v.userId,
    viewedAt: v.viewedAt,
    name: userMap[v.userId]?.name || "Unknown",
    avatar: userMap[v.userId]?.avatar,
  }));

  return NextResponse.json(enriched);
}
