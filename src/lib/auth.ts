import { auth } from "@clerk/nextjs/server";
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
 * - They belong to the org that owns it (team workspace via Clerk org)
 */
export async function canAccessWorkspace(
  workspaceId: string,
  userId: string,
  orgId: string | null
) {
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        { ownerId: userId },
        ...(orgId ? [{ orgId, isPersonal: false }] : []),
      ],
    },
    select: { id: true },
  });
  return !!workspace;
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

  const ws = document.workspace;
  const hasAccess =
    ws.ownerId === userId ||
    (orgId && ws.orgId === orgId && !ws.isPersonal);

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
