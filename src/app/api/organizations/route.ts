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

    // 4. Seed default agent configs (CEO, CTO, CRO) for the team scorecard
    await db.agentConfig.createMany({
      data: [
        {
          workspaceId: workspace.id,
          roleId: "ceo",
          name: "Chief Executive Officer",
          title: "CEO",
          color: "#c9a84c",
          description: "Strategic oversight, vision alignment, and team performance",
          systemPrompt: "You are the CEO AI agent. Focus on strategic alignment, company vision, team performance, and overall business health. Analyze activity for signal vs noise, identify what matters most, and recommend where leadership attention should go.",
          createdBy: userId,
        },
        {
          workspaceId: workspace.id,
          roleId: "cto",
          name: "Chief Technology Officer",
          title: "CTO",
          color: "#3b82f6",
          description: "Technical execution, development velocity, and engineering quality",
          systemPrompt: "You are the CTO AI agent. Focus on development velocity, code quality, technical debt, shipping cadence, and engineering team productivity. Analyze commits, documentation, and technical decisions.",
          createdBy: userId,
        },
        {
          workspaceId: workspace.id,
          roleId: "cro",
          name: "Chief Revenue Officer",
          title: "CRO",
          color: "#10b981",
          description: "Revenue generation, sales performance, and pipeline health",
          systemPrompt: "You are the CRO AI agent. Focus on sales pipeline, call outcomes, win rates, revenue trajectory, and go-to-market effectiveness. Analyze call logs, deal progress, and revenue-generating activities.",
          createdBy: userId,
        },
      ],
    });

    // 5. Generate a default invite code for this workspace
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

/**
 * PATCH /api/organizations
 * Update organization name (creator only).
 * Body: { orgId, name }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, name } = await request.json();
    if (!orgId || !name?.trim()) {
      return NextResponse.json({ error: "orgId and name required" }, { status: 400 });
    }

    // Use DB ownerId as source of truth for ownership
    const workspace = await db.workspace.findFirst({
      where: { orgId, isPersonal: false },
    });
    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Only the group owner can rename" }, { status: 403 });
    }

    const clerk = await clerkClient();

    // Update Clerk org name
    await clerk.organizations.updateOrganization(orgId, { name: name.trim() });

    // Update workspace name in DB
    await db.workspace.update({
      where: { id: workspace.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ ok: true, name: name.trim() });
  } catch (err: any) {
    console.error("PATCH /api/organizations error:", err);
    return NextResponse.json(
      { error: "Failed to update organization", detail: err?.message },
      { status: 500 }
    );
  }
}
