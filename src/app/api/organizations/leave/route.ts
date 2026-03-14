import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

    // Use DB ownerId as source of truth — owners can't leave
    const workspace = await db.workspace.findFirst({
      where: { orgId, isPersonal: false },
    });
    if (workspace?.ownerId === userId) {
      return NextResponse.json(
        { error: "As the group owner, you cannot leave. Transfer ownership or delete the group first." },
        { status: 403 }
      );
    }

    const clerk = await clerkClient();
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
