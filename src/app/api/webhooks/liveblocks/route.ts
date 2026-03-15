import { NextRequest, NextResponse } from "next/server";
import { WebhookHandler } from "@liveblocks/node";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET;

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

/**
 * POST /api/webhooks/liveblocks
 *
 * Handles Liveblocks webhook events:
 * - notification: When a user is mentioned or a thread reply is posted
 *   → sends an email alert to the target user
 */
export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("Missing LIVEBLOCKS_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: any;
  try {
    const webhookHandler = new WebhookHandler(WEBHOOK_SECRET);
    event = webhookHandler.verifyRequest({ rawBody: body, headers });
  } catch (err) {
    console.error("Liveblocks webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "notification": {
        const { userId, kind, roomId, inboxNotificationId } = event.data;

        // Only send emails for thread-related notifications
        if (kind !== "thread" && kind !== "textMention" && kind !== "$textMention") break;

        // Resolve the target user's email from Clerk
        const clerk = await clerkClient();
        let targetUser;
        try {
          targetUser = await clerk.users.getUser(userId);
        } catch {
          console.warn(`Could not find Clerk user ${userId} for notification`);
          break;
        }

        const email = targetUser.emailAddresses?.[0]?.emailAddress;
        if (!email) {
          console.warn(`User ${userId} has no email address`);
          break;
        }

        const userName = `${targetUser.firstName ?? ""} ${targetUser.lastName ?? ""}`.trim() || "there";

        // Extract document ID from room ID (format: "document:<id>")
        const docTitle = roomId?.replace("document:", "") ?? "a document";

        const resend = getResend();
        const fromAddress = process.env.EMAIL_FROM ?? "MarkedUp <notifications@markedup.app>";

        if (kind === "thread") {
          await resend.emails.send({
            from: fromAddress,
            to: email,
            subject: "New comment on your document — MarkedUp",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
                <p style="color: #111; font-size: 15px; line-height: 1.6;">
                  Hi ${userName},
                </p>
                <p style="color: #111; font-size: 15px; line-height: 1.6;">
                  Someone replied to a thread in one of your documents.
                </p>
                <div style="margin: 24px 0; padding: 16px; background: #f8f8f8; border-radius: 8px; border-left: 3px solid #6366f1;">
                  <p style="color: #444; font-size: 13px; margin: 0;">
                    Document: <strong>${docTitle}</strong>
                  </p>
                </div>
                <p style="color: #666; font-size: 13px;">
                  Open MarkedUp to view and reply.
                </p>
              </div>
            `,
          });
        } else {
          // textMention / $textMention
          await resend.emails.send({
            from: fromAddress,
            to: email,
            subject: "You were mentioned in a document — MarkedUp",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
                <p style="color: #111; font-size: 15px; line-height: 1.6;">
                  Hi ${userName},
                </p>
                <p style="color: #111; font-size: 15px; line-height: 1.6;">
                  You were mentioned in a document on MarkedUp.
                </p>
                <div style="margin: 24px 0; padding: 16px; background: #f8f8f8; border-radius: 8px; border-left: 3px solid #6366f1;">
                  <p style="color: #444; font-size: 13px; margin: 0;">
                    Document: <strong>${docTitle}</strong>
                  </p>
                </div>
                <p style="color: #666; font-size: 13px;">
                  Open MarkedUp to view the mention.
                </p>
              </div>
            `,
          });
        }

        console.log(`Sent ${kind} notification email to ${email}`);
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (err) {
    console.error(`Liveblocks webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
