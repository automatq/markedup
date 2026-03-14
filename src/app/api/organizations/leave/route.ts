import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * POST /api/organizations/leave
 * Leave the current Clerk organization.
 * Body: { orgId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await request.json();
    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const clerk = await clerkClient();

    // Check if user is the org creator — creators can't leave, they must delete
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    if (org.createdBy === userId) {
      return NextResponse.json(
        { error: "As the group creator, you cannot leave. You can delete the group instead." },
        { status: 403 }
      );
    }

    // Remove the user from the org
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/organizations/leave error:", err);
    return NextResponse.json(
      { error: "Failed to leave organization", detail: err?.message },
      { status: 500 }
    );
  }
}
