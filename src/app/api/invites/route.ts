import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import crypto from "crypto";

/** Generate a short, readable invite code */
function generateCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * POST /api/invites
 * Create an invite code for a workspace.
 * Body: { workspaceId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await request.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    // Only workspace owner can create invites
    const workspace = await db.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!workspace.orgId) {
      return NextResponse.json({ error: "Workspace must be linked to an organization" }, { status: 400 });
    }

    const code = generateCode();

    const invite = await db.invite.create({
      data: {
        code,
        workspaceId,
        orgId: workspace.orgId,
        createdBy: userId,
      },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/invites error:", err);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

/**
 * GET /api/invites?code=...
 * Validate an invite code (returns workspace info without consuming it).
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    const invite = await db.invite.findUnique({
      where: { code },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });

    if (!invite || !invite.enabled) {
      return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 404 });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 410 });
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return NextResponse.json({ error: "Invite code has been fully used" }, { status: 410 });
    }

    return NextResponse.json({
      code: invite.code,
      workspace: invite.workspace,
      orgId: invite.orgId,
    });
  } catch (err: any) {
    console.error("GET /api/invites error:", err);
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 });
  }
}

/**
 * PUT /api/invites
 * Redeem an invite code — adds user to the Clerk org and increments uses.
 * Body: { code }
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: "code required" }, { status: 400 });
    }

    const invite = await db.invite.findUnique({
      where: { code },
      include: { workspace: true },
    });

    if (!invite || !invite.enabled) {
      return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 404 });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 410 });
    }
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      return NextResponse.json({ error: "Invite code has been fully used" }, { status: 410 });
    }

    // Add user to the Clerk organization
    const clerk = await clerkClient();
    try {
      await clerk.organizations.createOrganizationMembership({
        organizationId: invite.orgId,
        userId,
        role: "org:member",
      });
    } catch (err: any) {
      // User might already be a member
      if (!err?.message?.includes("already")) {
        throw err;
      }
    }

    // Increment invite usage
    await db.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    });

    // Create personal workspace for this user if they don't have one
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

    return NextResponse.json({
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        slug: invite.workspace.slug,
      },
      orgId: invite.orgId,
    });
  } catch (err: any) {
    console.error("PUT /api/invites error:", err);
    return NextResponse.json({ error: "Failed to redeem invite" }, { status: 500 });
  }
}
