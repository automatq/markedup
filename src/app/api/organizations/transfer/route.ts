import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * POST /api/organizations/transfer
 * Transfer group ownership to another member.
 * Body: { orgId, newOwnerId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, newOwnerId } = await request.json();
    if (!orgId || !newOwnerId) {
      return NextResponse.json({ error: "orgId and newOwnerId required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    // Only the current creator can transfer ownership
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    if (org.createdBy !== userId) {
      return NextResponse.json({ error: "Only the group creator can transfer ownership" }, { status: 403 });
    }

    // Verify new owner is a member
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    const memberList = Array.isArray(memberships) ? memberships : memberships.data ?? [];
    const targetMember = memberList.find(
      (m: any) => m.publicUserData?.userId === newOwnerId
    );
    if (!targetMember) {
      return NextResponse.json({ error: "User is not a member of this group" }, { status: 400 });
    }

    // Promote the new owner to admin in Clerk
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: newOwnerId,
      role: "org:admin",
    });

    // Update workspace ownerId in DB
    const workspace = await db.workspace.findFirst({
      where: { orgId, isPersonal: false },
    });
    if (workspace) {
      await db.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: newOwnerId },
      });
    }

    // Note: Clerk doesn't allow changing `createdBy` directly,
    // but the admin role + DB ownerId is what our app checks.
    // We store the real owner in workspace.ownerId.

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/organizations/transfer error:", err);
    return NextResponse.json(
      { error: "Failed to transfer ownership", detail: err?.message },
      { status: 500 }
    );
  }
}
