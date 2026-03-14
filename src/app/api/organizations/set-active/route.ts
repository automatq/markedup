import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * POST /api/organizations/set-active
 * Sets the user's active Clerk organization.
 * Body: { orgId }
 *
 * Note: This is a server-side hint. The actual org switch
 * happens client-side via Clerk's `setActive` method.
 * We return the orgId so the client can call setActive.
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

    // We can't set the active org from the server side in Clerk v7.
    // Return the orgId so the client can do it via useOrganization().setActive()
    return NextResponse.json({ orgId, setActiveOnClient: true });
  } catch (err: any) {
    console.error("POST /api/organizations/set-active error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
