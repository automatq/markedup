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
  repo: string;
  url: string;
}

function ghAuthHeader(token: string): string {
  const prefix = token.startsWith("github_pat_") ? "Bearer" : "token";
  return `${prefix} ${token}`;
}

async function fetchRepoCommits(
  owner: string,
  repo: string,
  token: string | undefined,
  since: string
): Promise<GitHubCommit[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "MarkedUp",
  };
  if (token) headers.Authorization = ghAuthHeader(token);

  const allRaw: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers, next: { revalidate: 300 } });
    if (!res.ok) break;
    const batch = await res.json();
    allRaw.push(...batch);
    if (batch.length < 100) break;
  }

  return allRaw.map((c: any) => ({
    sha: c.sha?.slice(0, 7) || "",
    message: c.commit?.message?.split("\n")[0] || "",
    author: c.commit?.author?.name || c.author?.login || "Unknown",
    authorAvatar: c.author?.avatar_url || undefined,
    date: c.commit?.author?.date || c.commit?.committer?.date || "",
    repo: `${owner}/${repo}`,
    url: c.html_url || "",
  }));
}

/**
 * GET /api/github/activity?workspaceId=...&repo=owner/repo
 * If repo is omitted or "all", returns combined data from all configured repos.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const repoFilter = request.nextUrl.searchParams.get("repo") || "all";
    const days = parseInt(request.nextUrl.searchParams.get("days") || "365", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get all GitHub integrations for this workspace
    const integrations = await db.workspaceIntegration.findMany({
      where: { workspaceId, type: "github" },
    });

    if (integrations.length === 0) {
      return NextResponse.json({ repos: [], commits: [], configured: false });
    }

    // Build list of repos to fetch
    const repoConfigs = integrations.map((i) => {
      const c = i.config as { owner: string; repo: string; token?: string };
      return { owner: c.owner, repo: c.repo, token: c.token, fullName: `${c.owner}/${c.repo}`, id: i.id };
    });

    const reposToFetch =
      repoFilter === "all"
        ? repoConfigs
        : repoConfigs.filter((r) => r.fullName === repoFilter);

    // Fetch commits from all selected repos in parallel
    const commitArrays = await Promise.all(
      reposToFetch.map((r) => fetchRepoCommits(r.owner, r.repo, r.token, since))
    );
    const commits = commitArrays.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Build daily timeline for calendar (365 days)
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
      if (existing) existing.commits++;
      else authorMap.set(c.author, { name: c.author, avatar: c.authorAvatar, commits: 1 });
    }
    const authors = Array.from(authorMap.values()).sort((a, b) => b.commits - a.commits);

    return NextResponse.json({
      configured: true,
      repos: repoConfigs.map((r) => ({ id: r.id, name: r.fullName })),
      activeRepo: repoFilter,
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
 * Add a GitHub repo to the workspace.
 * Body: { workspaceId, owner, repo, token? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workspaceId, owner, repo, token } = body;

    if (!workspaceId || !owner || !repo) {
      return NextResponse.json({ error: "workspaceId, owner, and repo required" }, { status: 400 });
    }

    if (!(await canAccessWorkspace(workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "MarkedUp",
    };
    if (token) headers.Authorization = ghAuthHeader(token);

    const testUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const testRes = await fetch(testUrl, { headers });
    if (!testRes.ok) {
      const detail = await testRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Could not access ${owner}/${repo} (${testRes.status}). GitHub says: ${detail.slice(0, 200)}` },
        { status: 400 }
      );
    }

    const name = `${owner}/${repo}`;
    const integration = await db.workspaceIntegration.upsert({
      where: { workspaceId_type_name: { workspaceId, type: "github", name } },
      update: { config: { owner, repo, token: token || undefined }, updatedAt: new Date() },
      create: {
        workspaceId,
        type: "github",
        name,
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

/**
 * DELETE /api/github/activity?id=...
 * Remove a GitHub repo from the workspace.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const integration = await db.workspaceIntegration.findUnique({ where: { id } });
    if (!integration) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!(await canAccessWorkspace(integration.workspaceId, userId, orgId ?? null))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.workspaceIntegration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/github/activity error:", err);
    return NextResponse.json({ error: "Failed to remove repo" }, { status: 500 });
  }
}
