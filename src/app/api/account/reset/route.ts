import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * POST /api/account/reset
 * Dev tool: wipes all workspaces/orgs for the current user so they can re-onboard.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();

    // 1. Find all workspaces owned by user
    const workspaces = await db.workspace.findMany({
      where: { ownerId: userId },
    });

    // 2. Delete workspaces from DB (cascades to docs, agents, invites, etc.)
    for (const ws of workspaces) {
      await db.workspace.delete({ where: { id: ws.id } });
    }

    // 3. Leave/delete all Clerk orgs
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
      limit: 50,
    });
    const memberList = Array.isArray(memberships)
      ? memberships
      : memberships.data ?? [];

    for (const m of memberList) {
      const orgId = m.organization?.id;
      if (!orgId) continue;
      try {
        // Try to delete org (works if creator)
        await clerk.organizations.deleteOrganization(orgId);
      } catch {
        // Otherwise just leave
        try {
          await clerk.organizations.deleteOrganizationMembership({
            organizationId: orgId,
            userId,
          });
        } catch {}
      }
    }

    // 4. Clear onboarding flag
    const user = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, {
      unsafeMetadata: {
        ...((user.unsafeMetadata as Record<string, unknown>) || {}),
        onboardingComplete: false,
      },
    });

    return NextResponse.json({ ok: true, deleted: workspaces.length });
  } catch (err: any) {
    console.error("POST /api/account/reset error:", err);
    return NextResponse.json(
      { error: "Failed to reset", detail: err?.message },
      { status: 500 }
    );
  }
}
