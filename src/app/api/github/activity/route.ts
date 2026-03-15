import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canAccessWorkspace } from "@/lib/auth";

interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  date: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  url: string;
}

/**
 * GET /api/github/activity?workspaceId=...&days=30
 * Fetches recent commits from the workspace's configured GitHub repo.
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

    const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get GitHub integration config
    const integration = await db.workspaceIntegration.findUnique({
      where: { workspaceId_type: { workspaceId, type: "github" } },
    });

    if (!integration) {
      return NextResponse.json({ commits: [], configured: false });
    }

    const config = integration.config as { owner: string; repo: string; token?: string };
    const { owner, repo, token } = config;

    // Fetch commits from GitHub API
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "MarkedUp",
    };
    if (token) {
      const prefix = token.startsWith("github_pat_") ? "Bearer" : "token";
      headers.Authorization = `${prefix} ${token}`;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100`;
    const res = await fetch(url, { headers, next: { revalidate: 300 } });

    if (!res.ok) {
      const text = await res.text();
      console.error("GitHub API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch from GitHub", detail: res.status },
        { status: 502 }
      );
    }

    const raw = await res.json();

    const commits: GitHubCommit[] = raw.map((c: any) => ({
      sha: c.sha?.slice(0, 7) || "",
      message: c.commit?.message?.split("\n")[0] || "",
      author: c.commit?.author?.name || c.author?.login || "Unknown",
      authorAvatar: c.author?.avatar_url || undefined,
      date: c.commit?.author?.date || c.commit?.committer?.date || "",
      additions: c.stats?.additions || 0,
      deletions: c.stats?.deletions || 0,
      filesChanged: c.files?.length || 0,
      url: c.html_url || "",
    }));

    // Build daily commit counts for charting
    const dailyCommits: Record<string, { date: string; commits: number; authors: Set<string> }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyCommits[key] = { date: key, commits: 0, authors: new Set() };
    }
    for (const c of commits) {
      const day = c.date.slice(0, 10);
      if (dailyCommits[day]) {
        dailyCommits[day].commits++;
        dailyCommits[day].authors.add(c.author);
      }
    }

    const timeline = Object.values(dailyCommits).map((d) => ({
      date: d.date,
      commits: d.commits,
      authors: d.authors.size,
    }));

    // Author breakdown
    const authorMap = new Map<string, { name: string; avatar?: string; commits: number }>();
    for (const c of commits) {
      const existing = authorMap.get(c.author);
      if (existing) {
        existing.commits++;
      } else {
        authorMap.set(c.author, { name: c.author, avatar: c.authorAvatar, commits: 1 });
      }
    }
    const authors = Array.from(authorMap.values()).sort((a, b) => b.commits - a.commits);

    return NextResponse.json({
      configured: true,
      repo: `${owner}/${repo}`,
      totalCommits: commits.length,
      commits: commits.slice(0, 50),
      timeline,
      authors,
    });
  } catch (err) {
    console.error("GET /api/github/activity error:", err);
    return NextResponse.json({ error: "Failed to load GitHub activity" }, { status: 500 });
  }
}

/**
 * POST /api/github/activity
 * Configure GitHub integration for a workspace.
 * Body: { workspaceId, owner, repo, token? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, owner, repo, token } = body;

    if (!workspaceId || !owner || !repo) {
      return NextResponse.json({ error: "workspaceId, owner, and repo required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the repo is accessible
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "MarkedUp",
    };
    if (token) {
      // Classic tokens (ghp_) use "token" prefix, fine-grained (github_pat_) use "Bearer"
      const prefix = token.startsWith("github_pat_") ? "Bearer" : "token";
      headers.Authorization = `${prefix} ${token}`;
    }

    const testRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!testRes.ok) {
      const detail = await testRes.text().catch(() => "");
      console.error("GitHub repo verify failed:", testRes.status, detail);
      return NextResponse.json(
        { error: `Could not access ${owner}/${repo} (${testRes.status}). Check owner/repo and token.` },
        { status: 400 }
      );
    }

    const integration = await db.workspaceIntegration.upsert({
      where: { workspaceId_type: { workspaceId, type: "github" } },
      update: { config: { owner, repo, token: token || undefined }, updatedAt: new Date() },
      create: {
        workspaceId,
        type: "github",
        config: { owner, repo, token: token || undefined },
        createdBy: userId,
      },
    });

    return NextResponse.json({ success: true, id: integration.id });
  } catch (err) {
    console.error("POST /api/github/activity error:", err);
    return NextResponse.json({ error: "Failed to configure GitHub" }, { status: 500 });
  }
}
