import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth, canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/share/publish?documentId=...
 * Get the current publish status for a document.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const doc = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(doc.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const link = await db.shareLink.findFirst({
      where: { documentId, published: true },
      select: {
        id: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        enabled: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ published: !!link?.enabled, link });
  } catch (err) {
    console.error("GET /api/share/publish error:", err);
    return NextResponse.json({ error: "Failed to fetch publish status" }, { status: 500 });
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "untitled";
}

/**
 * POST /api/share/publish
 * Publish or unpublish a document. Updates SEO fields.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, publish, slug, seoTitle, seoDescription } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const doc = await db.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true, title: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!(await canAccessWorkspace(doc.workspaceId, userId, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find existing publish link
    const existing = await db.shareLink.findFirst({
      where: { documentId, published: true },
    });

    if (publish === false) {
      // Unpublish
      if (existing) {
        await db.shareLink.update({
          where: { id: existing.id },
          data: { enabled: false },
        });
      }
      return NextResponse.json({ published: false });
    }

    // Publish (create or update)
    let desiredSlug = (slug && slug.trim()) || slugify(doc.title);

    // Ensure slug uniqueness — append suffix if taken
    if (!existing || existing.slug !== desiredSlug) {
      let suffix = 0;
      let candidate = desiredSlug;
      while (true) {
        const conflict = await db.shareLink.findUnique({ where: { slug: candidate } });
        if (!conflict || conflict.id === existing?.id) {
          desiredSlug = candidate;
          break;
        }
        suffix++;
        candidate = `${desiredSlug}-${suffix}`;
      }
    }

    if (existing) {
      const updated = await db.shareLink.update({
        where: { id: existing.id },
        data: {
          slug: desiredSlug,
          seoTitle: seoTitle ?? null,
          seoDescription: seoDescription ?? null,
          enabled: true,
        },
      });
      return NextResponse.json({ published: true, link: updated });
    }

    const created = await db.shareLink.create({
      data: {
        documentId,
        createdBy: userId,
        permission: "view",
        enabled: true,
        published: true,
        slug: desiredSlug,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
      },
    });

    return NextResponse.json({ published: true, link: created });
  } catch (err) {
    console.error("POST /api/share/publish error:", err);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
