import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

/**
 * GET /api/overview?workspaceId=...
 * Returns a comprehensive activity overview for the workspace dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel data fetches
    const [
      workspace,
      allDocs,
      recentDocs,
      recentBreakouts,
      recentCallLogs,
      agentConfigs,
      recentViews,
      trashedCount,
    ] = await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, orgId: true, isPersonal: true, createdAt: true },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, createdBy: true, createdAt: true, updatedAt: true },
      }),
      db.document.findMany({
        where: { workspaceId, deletedAt: null, updatedAt: { gte: sevenDaysAgo } },
        select: { id: true, title: true, createdBy: true, createdAt: true, updatedAt: true, parentId: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      db.breakout.findMany({
        where: { document: { workspaceId, deletedAt: null }, createdAt: { gte: sevenDaysAgo } },
        select: { id: true, agentName: true, createdBy: true, createdAt: true, document: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.callLog.findMany({
        where: { workspaceId, createdAt: { gte: sevenDaysAgo } },
        select: { id: true, title: true, createdBy: true, outcome: true, score: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.agentConfig.findMany({
        where: { workspaceId },
        select: { id: true, name: true, title: true, color: true, avatar: true },
      }),
      db.documentView.findMany({
        where: { document: { workspaceId, deletedAt: null }, viewedAt: { gte: sevenDaysAgo } },
        select: { userId: true, viewedAt: true, document: { select: { id: true, title: true } } },
        orderBy: { viewedAt: "desc" },
        take: 30,
      }),
      db.document.count({
        where: { workspaceId, deletedAt: { not: null } },
      }),
    ]);

    // Gather all user IDs for name resolution
    const userIdSet = new Set<string>();
    for (const d of recentDocs) if (d.createdBy) userIdSet.add(d.createdBy);
    for (const b of recentBreakouts) if (b.createdBy) userIdSet.add(b.createdBy);
    for (const c of recentCallLogs) if (c.createdBy) userIdSet.add(c.createdBy);
    for (const v of recentViews) if (v.userId) userIdSet.add(v.userId);

    const userMap: Record<string, { name: string; avatar?: string }> = {};
    if (userIdSet.size > 0) {
      try {
        const clerk = await clerkClient();
        const users = await Promise.all(
          Array.from(userIdSet).map((id) => clerk.users.getUser(id).catch(() => null))
        );
        for (const u of users) {
          if (u) {
            userMap[u.id] = {
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.emailAddresses[0]?.emailAddress || "Unknown",
              avatar: u.imageUrl || undefined,
            };
          }
        }
      } catch {}
    }

    // Build activity feed — unified timeline of all actions
    const activity: {
      type: "doc_created" | "doc_updated" | "breakout" | "call" | "view";
      title: string;
      subtitle?: string;
      userId?: string;
      userName?: string;
      userAvatar?: string;
      timestamp: string;
      meta?: Record<string, any>;
    }[] = [];

    for (const doc of recentDocs) {
      const isNew = now.getTime() - new Date(doc.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
      const user = doc.createdBy ? userMap[doc.createdBy] : null;
      if (isNew) {
        activity.push({
          type: "doc_created",
          title: `Created "${doc.title || "Untitled"}"`,
          userId: doc.createdBy || undefined,
          userName: user?.name,
          userAvatar: user?.avatar,
          timestamp: doc.createdAt.toISOString(),
          meta: { docId: doc.id },
        });
      }
      // Show updates that are different from creation time
      if (doc.updatedAt.getTime() - doc.createdAt.getTime() > 60000) {
        activity.push({
          type: "doc_updated",
          title: `Edited "${doc.title || "Untitled"}"`,
          userId: doc.createdBy || undefined,
          userName: user?.name,
          userAvatar: user?.avatar,
          timestamp: doc.updatedAt.toISOString(),
          meta: { docId: doc.id },
        });
      }
    }

    for (const b of recentBreakouts) {
      const user = b.createdBy ? userMap[b.createdBy] : null;
      activity.push({
        type: "breakout",
        title: `Generated breakout: ${b.agentName}`,
        subtitle: `for "${b.document.title}"`,
        userId: b.createdBy || undefined,
        userName: user?.name,
        userAvatar: user?.avatar,
        timestamp: b.createdAt.toISOString(),
      });
    }

    for (const c of recentCallLogs) {
      const user = c.createdBy ? userMap[c.createdBy] : null;
      activity.push({
        type: "call",
        title: `Logged call: ${c.title}`,
        subtitle: c.outcome ? `Outcome: ${c.outcome}${c.score ? ` (${c.score}/100)` : ""}` : undefined,
        userId: c.createdBy || undefined,
        userName: user?.name,
        userAvatar: user?.avatar,
        timestamp: c.createdAt.toISOString(),
      });
    }

    // Sort by timestamp desc
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Stats
    const docsCreatedThisWeek = allDocs.filter(
      (d) => new Date(d.createdAt).getTime() >= sevenDaysAgo.getTime()
    ).length;
    const docsEditedThisWeek = recentDocs.length;
    const uniqueContributors = new Set(allDocs.map((d) => d.createdBy).filter(Boolean)).size;

    // Most active documents (by view count in last 7 days)
    const viewCounts = new Map<string, { title: string; count: number }>();
    for (const v of recentViews) {
      const existing = viewCounts.get(v.document.id);
      if (existing) {
        existing.count++;
      } else {
        viewCounts.set(v.document.id, { title: v.document.title, count: 1 });
      }
    }
    const popularDocs = Array.from(viewCounts.entries())
      .map(([id, { title, count }]) => ({ id, title, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Member activity breakdown
    const memberActivity: Record<string, { name: string; avatar?: string; docs: number; edits: number }> = {};
    for (const doc of allDocs) {
      if (!doc.createdBy) continue;
      if (!memberActivity[doc.createdBy]) {
        const user = userMap[doc.createdBy];
        memberActivity[doc.createdBy] = {
          name: user?.name || "Unknown",
          avatar: user?.avatar,
          docs: 0,
          edits: 0,
        };
      }
      memberActivity[doc.createdBy].docs++;
      if (new Date(doc.updatedAt).getTime() >= sevenDaysAgo.getTime()) {
        memberActivity[doc.createdBy].edits++;
      }
    }

    return NextResponse.json({
      workspace: {
        name: workspace?.name || "Workspace",
        isPersonal: workspace?.isPersonal || false,
        createdAt: workspace?.createdAt,
      },
      stats: {
        totalDocs: allDocs.length,
        docsCreatedThisWeek,
        docsEditedThisWeek,
        uniqueContributors,
        totalBreakouts: recentBreakouts.length,
        totalCalls: recentCallLogs.length,
        agentCount: agentConfigs.length,
        trashedCount,
      },
      activity: activity.slice(0, 30),
      popularDocs,
      memberActivity: Object.entries(memberActivity)
        .map(([id, data]) => ({ userId: id, ...data }))
        .sort((a, b) => b.edits - a.edits || b.docs - a.docs),
      agents: agentConfigs,
    });
  } catch (err) {
    console.error("GET /api/overview error:", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
