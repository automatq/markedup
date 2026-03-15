import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * GET /api/organizations/members?orgId=...
 * List members of an organization.
 * Uses workspace.ownerId (DB) as the source of truth for ownership.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId: userOrgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    // Check actual org membership (not just active org)
    if (userOrgId !== orgId) {
      try {
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId,
          limit: 50,
        });
        const membershipList = Array.isArray(memberships)
          ? memberships
          : memberships.data ?? [];
        const userOrgIds = membershipList
          .map((m: any) => m.organization?.id)
          .filter(Boolean) as string[];
        if (!userOrgIds.includes(orgId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const membershipsResponse = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    const membershipList = Array.isArray(membershipsResponse)
      ? membershipsResponse
      : membershipsResponse.data ?? [];

    const members = membershipList.map((m: any) => ({
      userId: m.publicUserData?.userId,
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
        .filter(Boolean)
        .join(" ") || m.publicUserData?.identifier || "Unknown",
      email: m.publicUserData?.identifier || "",
      avatar: m.publicUserData?.imageUrl || null,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    // Use DB workspace.ownerId as source of truth (survives ownership transfers)
    const workspace = await db.workspace.findFirst({
      where: { orgId, isPersonal: false },
    });
    const ownerId = workspace?.ownerId ?? null;

    // Get org name from Clerk
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });

    return NextResponse.json({
      members,
      ownerId,
      orgName: org.name,
    });
  } catch (err: any) {
    console.error("GET /api/organizations/members error:", err);
    return NextResponse.json(
      { error: "Failed to fetch members", detail: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/members?orgId=...&userId=...
 * Remove a member from the organization (owner only).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");
    const targetUserId = request.nextUrl.searchParams.get("userId");
    if (!orgId || !targetUserId) {
      return NextResponse.json({ error: "orgId and userId required" }, { status: 400 });
    }

    // Use DB ownerId as source of truth
    const workspace = await db.workspace.findFirst({
      where: { orgId, isPersonal: false },
    });
    if (!workspace || workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Only the group owner can remove members" }, { status: 403 });
    }

    if (targetUserId === userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    const clerk = await clerkClient();
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/organizations/members error:", err);
    return NextResponse.json(
      { error: "Failed to remove member", detail: err?.message },
      { status: 500 }
    );
  }
}
