import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * POST /api/organizations
 * Creates a Clerk Organization, a company workspace linked to it,
 * and a personal workspace for the user.
 * Body: { name }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    // 1. Create Clerk Organization
    const org = await clerk.organizations.createOrganization({
      name: name.trim(),
      createdBy: userId,
    });

    // 2. Create the company workspace tied to this org
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";

    // Deduplicate slug
    let finalSlug = slug;
    const existingSlug = await db.workspace.findUnique({ where: { slug } });
    if (existingSlug) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        ownerId: userId,
        orgId: org.id,
        isPersonal: false,
      },
    });

    // 3. Create personal workspace for this user (if doesn't exist)
    const existingPersonal = await db.workspace.findFirst({
      where: { ownerId: userId, isPersonal: true },
    });
    if (!existingPersonal) {
      await db.workspace.create({
        data: {
          name: "My Space",
          slug: `personal-${userId}-${Date.now()}`,
          ownerId: userId,
          isPersonal: true,
        },
      });
    }

    // 4. Generate a default invite code for this workspace
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    await db.invite.create({
      data: {
        code,
        workspaceId: workspace.id,
        orgId: org.id,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      orgId: org.id,
      workspaceId: workspace.id,
      inviteCode: code,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/organizations error:", err);
    return NextResponse.json(
      { error: "Failed to create organization", detail: err?.message },
      { status: 500 }
    );
  }
}
