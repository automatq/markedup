import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/organizations/members?orgId=...
 * List members of an organization.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    const members = memberships.data.map((m) => ({
      userId: m.publicUserData?.userId,
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
        .filter(Boolean)
        .join(" ") || m.publicUserData?.identifier || "Unknown",
      email: m.publicUserData?.identifier || "",
      avatar: m.publicUserData?.imageUrl || null,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    // Also get org info to know who the creator is
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });

    return NextResponse.json({
      members,
      createdBy: org.createdBy,
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
 * Remove a member from the organization (admin only).
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

    const clerk = await clerkClient();

    // Only the org creator can remove members
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    if (org.createdBy !== userId) {
      return NextResponse.json({ error: "Only the group creator can remove members" }, { status: 403 });
    }

    // Can't remove yourself
    if (targetUserId === userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

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
