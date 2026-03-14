import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/users/search?query=...     — search by name/email
 * GET /api/users/search?ids=a&ids=b   — resolve specific user IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const query = request.nextUrl.searchParams.get("query");
    const ids = request.nextUrl.searchParams.getAll("ids");

    let users;

    if (ids.length > 0) {
      // Resolve specific user IDs
      const { data } = await clerk.users.getUserList({
        userId: ids,
        limit: ids.length,
      });
      users = data;
    } else {
      // Search by query string
      const { data } = await clerk.users.getUserList({
        query: query || undefined,
        limit: 20,
      });
      users = data;
    }

    const results = users.map((u) => ({
      id: u.id,
      name:
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
        u.username ||
        "Anonymous",
      avatar: u.imageUrl,
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
