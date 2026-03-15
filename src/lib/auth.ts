import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get the authenticated user's ID and org ID.
 * Returns null userId if not authenticated.
 */
export async function getAuth() {
  const { userId, orgId } = await auth();
  return { userId, orgId: orgId ?? null };
}

/**
 * Check if a user can access a workspace.
 * A user can access a workspace if:
 * - They own it (personal or team workspace owner)
 * - They belong to the org that owns it (checked via Clerk membership, not just active org)
 */
export async function canAccessWorkspace(
  workspaceId: string,
  userId: string,
  orgId: string | null
) {
  // First check ownership (fast path)
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true, orgId: true, isPersonal: true },
  });
  if (!workspace) return false;

  // Owner always has access
  if (workspace.ownerId === userId) return true;

  // Personal workspaces are owner-only
  if (workspace.isPersonal) return false;

  // Team workspace — check if user belongs to the workspace's org
  if (workspace.orgId) {
    // Fast path: active org matches
    if (orgId === workspace.orgId) return true;

    // Full check: look up user's org memberships from Clerk
    try {
      const clerk = await clerkClient();
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
      return userOrgIds.includes(workspace.orgId);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if a user can access a document.
 * Resolves the document's workspace and checks workspace access.
 * Returns the document (with workspace) if accessible, null otherwise.
 */
export async function canAccessDocument(
  documentId: string,
  userId: string,
  orgId: string | null
) {
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      workspaceId: true,
      workspace: {
        select: {
          id: true,
          ownerId: true,
          orgId: true,
          isPersonal: true,
        },
      },
    },
  });

  if (!document) return null;

  const hasAccess = await canAccessWorkspace(
    document.workspaceId,
    userId,
    orgId
  );

  return hasAccess ? document : null;
}

/**
 * Check if a user belongs to a specific Clerk organization.
 */
export async function isOrgMember(
  orgId: string,
  userId: string,
  userOrgId: string | null
) {
  // Fast path: user's active org matches
  return userOrgId === orgId;
}

/**
 * Require workspace access or return a 403 Response.
 * Use in API routes: const err = await requireWorkspaceAccess(...); if (err) return err;
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string,
  orgId: string | null
) {
  const hasAccess = await canAccessWorkspace(workspaceId, userId, orgId);
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

/**
 * Require document access or return a 403/404 Response.
 * Returns the document if accessible.
 */
export async function requireDocumentAccess(
  documentId: string,
  userId: string,
  orgId: string | null
) {
  const doc = await canAccessDocument(documentId, userId, orgId);
  if (!doc) {
    return {
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
      document: null,
    };
  }
  return { error: null, document: doc };
}
