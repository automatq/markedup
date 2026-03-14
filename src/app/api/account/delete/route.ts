import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * GET /api/account/delete
 * Pre-check: returns groups the user owns that need to be resolved.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find team workspaces the user owns
    const ownedWorkspaces = await db.workspace.findMany({
      where: { ownerId: userId, isPersonal: false },
    });

    const clerk = await clerkClient();
    const ownedGroups = [];

    for (const ws of ownedWorkspaces) {
      if (!ws.orgId) continue;
      try {
        const org = await clerk.organizations.getOrganization({ organizationId: ws.orgId });
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: ws.orgId,
          limit: 100,
        });
        const memberList = Array.isArray(memberships) ? memberships : memberships.data ?? [];
        const members = memberList
          .filter((m: any) => m.publicUserData?.userId !== userId)
          .map((m: any) => ({
            userId: m.publicUserData?.userId,
            name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
              .filter(Boolean)
              .join(" ") || m.publicUserData?.identifier || "Unknown",
            avatar: m.publicUserData?.imageUrl || null,
          }));

        ownedGroups.push({
          orgId: ws.orgId,
          workspaceId: ws.id,
          name: org.name,
          memberCount: memberList.length,
          members,
        });
      } catch {}
    }

    return NextResponse.json({ ownedGroups });
  } catch (err: any) {
    console.error("GET /api/account/delete error:", err);
    return NextResponse.json(
      { error: "Failed to check account", detail: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account/delete
 * Delete the user's account after resolving all owned groups.
 * Body: { actions: [{ orgId, action: "transfer" | "delete", newOwnerId? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actions } = await request.json();
    const clerk = await clerkClient();

    // Process each owned group action
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        if (action.action === "transfer" && action.newOwnerId) {
          // Transfer ownership
          await clerk.organizations.updateOrganizationMembership({
            organizationId: action.orgId,
            userId: action.newOwnerId,
            role: "org:admin",
          });
          const ws = await db.workspace.findFirst({
            where: { orgId: action.orgId, isPersonal: false },
          });
          if (ws) {
            await db.workspace.update({
              where: { id: ws.id },
              data: { ownerId: action.newOwnerId },
            });
          }
        } else if (action.action === "delete") {
          // Delete the workspace (cascades to docs, agents, etc.)
          const ws = await db.workspace.findFirst({
            where: { orgId: action.orgId, isPersonal: false },
          });
          if (ws) {
            await db.workspace.delete({ where: { id: ws.id } });
          }
          // Delete the Clerk org
          try {
            await clerk.organizations.deleteOrganization(action.orgId);
          } catch {}
        }
      }
    }

    // Delete user's personal workspace
    const personalWs = await db.workspace.findFirst({
      where: { ownerId: userId, isPersonal: true },
    });
    if (personalWs) {
      await db.workspace.delete({ where: { id: personalWs.id } });
    }

    // Delete the Clerk user account
    await clerk.users.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST /api/account/delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete account", detail: err?.message },
      { status: 500 }
    );
  }
}
