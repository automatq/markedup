import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events for cleanup when users/orgs are deleted.
 */
export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Verify the webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();

  let event: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      case "user.deleted": {
        const userId = data.id;
        if (!userId) break;

        // Delete personal workspace (cascades to docs, etc.)
        const personalWs = await db.workspace.findFirst({
          where: { ownerId: userId, isPersonal: true },
        });
        if (personalWs) {
          await db.workspace.delete({ where: { id: personalWs.id } });
        }

        console.log(`Cleaned up data for deleted user: ${userId}`);
        break;
      }

      case "organization.deleted": {
        const orgId = data.id;
        if (!orgId) break;

        // Delete all workspaces tied to this org (cascades to everything)
        const workspaces = await db.workspace.findMany({
          where: { orgId },
        });
        for (const ws of workspaces) {
          await db.workspace.delete({ where: { id: ws.id } });
        }

        console.log(`Cleaned up data for deleted org: ${orgId}`);
        break;
      }

      case "organizationMembership.deleted": {
        // A user was removed from an org — no DB cleanup needed
        // since workspace data is shared, not per-user
        console.log(`Member removed from org: ${data.organization?.id}`);
        break;
      }

      default:
        // Unhandled event type — that's fine
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
