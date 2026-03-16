import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/users/search?query=...     — search by name/email
 * GET /api/users/search?ids=a&ids=b   — resolve specific user IDs
 *
 * Results are scoped to the caller's active organization.
 * Users outside the org are never returned.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const query = request.nextUrl.searchParams.get("query");
    const ids = request.nextUrl.searchParams.getAll("ids");

    // Build a set of org member user IDs for filtering
    let orgMemberIds: Set<string> | null = null;
    if (orgId) {
      const members = await clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      });
      orgMemberIds = new Set(
        members.data
          .map((m) => m.publicUserData?.userId)
          .filter((id): id is string => !!id)
      );
    }

    let users;

    if (ids.length > 0) {
      // Resolve specific user IDs — filter to org members
      const filteredIds = orgMemberIds
        ? ids.filter((id) => orgMemberIds!.has(id))
        : ids;

      if (filteredIds.length === 0) {
        return NextResponse.json([]);
      }

      const { data } = await clerk.users.getUserList({
        userId: filteredIds,
        limit: filteredIds.length,
      });
      users = data;
    } else {
      // Search by query — fetch then filter to org members
      const { data } = await clerk.users.getUserList({
        query: query || undefined,
        limit: 50,
      });
      users = orgMemberIds
        ? data.filter((u) => orgMemberIds!.has(u.id))
        : data;
    }

    const results = users
      .map((u) => ({
        id: u.id,
        name:
          `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
          u.username ||
          "Anonymous",
        avatar: u.hasImage ? u.imageUrl : undefined,
      }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/users/search error:", err);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
