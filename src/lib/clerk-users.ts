import { clerkClient } from "@clerk/nextjs/server";

/**
 * Batch-resolve Clerk user IDs to name/avatar maps.
 * Uses getUserList with userId filter for efficient batch fetch
 * instead of individual getUser calls (avoids N+1 queries).
 */
export async function resolveUsers(
  userIds: string[]
): Promise<Record<string, { name: string; avatar?: string }>> {
  if (userIds.length === 0) return {};

  const clerk = await clerkClient();
  const userMap: Record<string, { name: string; avatar?: string }> = {};

  // Clerk getUserList supports up to 100 users per call
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 100) {
    chunks.push(userIds.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await clerk.users.getUserList({
        userId: chunk,
        limit: 100,
      });
      const users = Array.isArray(response) ? response : response.data ?? [];
      for (const u of users) {
        userMap[u.id] = {
          name:
            `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
            u.emailAddresses[0]?.emailAddress ||
            "Unknown",
          avatar: u.imageUrl || undefined,
        };
      }
    } catch {
      // Silently continue — missing users will just be absent from the map
    }
  }

  return userMap;
}
