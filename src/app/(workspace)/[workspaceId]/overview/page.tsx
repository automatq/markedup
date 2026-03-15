"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  FileText,
  Users,
  Sparkles,
  Phone,
  Eye,
  Plus,
  Edit3,
  Loader2,
  TrendingUp,
  Clock,
  BarChart3,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface OverviewData {
  workspace: { name: string; isPersonal: boolean; createdAt: string };
  stats: {
    totalDocs: number;
    docsCreatedThisWeek: number;
    docsEditedThisWeek: number;
    uniqueContributors: number;
    totalBreakouts: number;
    totalCalls: number;
    agentCount: number;
    trashedCount: number;
  };
  activity: ActivityItem[];
  popularDocs: { id: string; title: string; views: number }[];
  memberActivity: { userId: string; name: string; avatar?: string; docs: number; edits: number }[];
  agents: { id: string; name: string; title: string; color: string; avatar: string }[];
}

interface ActivityItem {
  type: "doc_created" | "doc_updated" | "breakout" | "call" | "view";
  title: string;
  subtitle?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  timestamp: string;
  meta?: Record<string, any>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "doc_created": return <Plus className={`${cls} text-emerald-500`} />;
    case "doc_updated": return <Edit3 className={`${cls} text-blue-500`} />;
    case "breakout": return <Sparkles className={`${cls} text-purple-500`} />;
    case "call": return <Phone className={`${cls} text-amber-500`} />;
    case "view": return <Eye className={`${cls} text-black/30 dark:text-white/30`} />;
  }
}

function activityColor(type: ActivityItem["type"]): string {
  switch (type) {
    case "doc_created": return "bg-emerald-500/10 border-emerald-500/20";
    case "doc_updated": return "bg-blue-500/10 border-blue-500/20";
    case "breakout": return "bg-purple-500/10 border-purple-500/20";
    case "call": return "bg-amber-500/10 border-amber-500/20";
    case "view": return "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10";
  }
}

export default function OverviewPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/overview?workspaceId=${workspaceId}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchOverview();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-black/20 dark:text-white/20" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-black/40 dark:text-white/40">Failed to load overview.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-black/30 dark:text-white/30 mb-3">
              <BarChart3 className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-widest font-medium">Overview</span>
            </div>
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
              {data.workspace.name}
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 mt-1">
              Live activity dashboard — everything happening across your workspace.
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchOverview(); }}
            className="flex items-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 px-3 py-1.5 text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={FileText}
            label="Total Pages"
            value={data.stats.totalDocs}
            sub={data.stats.docsCreatedThisWeek > 0 ? `+${data.stats.docsCreatedThisWeek} this week` : undefined}
            color="text-black/50 dark:text-white/50"
          />
          <StatCard
            icon={TrendingUp}
            label="Active This Week"
            value={data.stats.docsEditedThisWeek}
            sub="pages edited"
            color="text-blue-500"
          />
          <StatCard
            icon={Users}
            label="Contributors"
            value={data.stats.uniqueContributors}
            sub={data.stats.agentCount > 0 ? `${data.stats.agentCount} AI agent${data.stats.agentCount > 1 ? "s" : ""}` : undefined}
            color="text-indigo-500"
          />
          <StatCard
            icon={Activity}
            label="This Week"
            value={data.stats.totalBreakouts + data.stats.totalCalls}
            sub={`${data.stats.totalBreakouts} breakouts, ${data.stats.totalCalls} calls`}
            color="text-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed — takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-black/30 dark:text-white/30" />
              <h2 className="text-sm font-semibold text-black dark:text-white">Activity Feed</h2>
              <span className="text-[10px] text-black/25 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">
                Last 7 days
              </span>
            </div>

            {data.activity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-10 text-center">
                <Activity className="h-6 w-6 text-black/10 dark:text-white/10 mx-auto mb-3" />
                <p className="text-sm text-black/30 dark:text-white/30">No recent activity</p>
                <p className="text-[11px] text-black/20 dark:text-white/20 mt-1">
                  Activity from the last 7 days will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.activity.map((item, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-3 rounded-xl px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-default"
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${activityColor(item.type)}`}>
                      <ActivityIcon type={item.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-black/70 dark:text-white/70 leading-snug">
                        {item.userName && (
                          <span className="font-medium text-black dark:text-white">{item.userName} </span>
                        )}
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{item.subtitle}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0 mt-0.5">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Popular Pages */}
            {data.popularDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
                    Most Viewed
                  </h3>
                </div>
                <div className="rounded-xl border border-black/6 dark:border-white/8 divide-y divide-black/5 dark:divide-white/5">
                  {data.popularDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => router.push(`/${workspaceId}/${doc.id}`)}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group first:rounded-t-xl last:rounded-b-xl"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-black/20 dark:text-white/20" />
                      <span className="flex-1 truncate text-xs text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {doc.title || "Untitled"}
                      </span>
                      <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0 flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {doc.views}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members */}
            {data.memberActivity.length > 1 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
                    Team Activity
                  </h3>
                </div>
                <div className="rounded-xl border border-black/6 dark:border-white/8 divide-y divide-black/5 dark:divide-white/5">
                  {data.memberActivity.slice(0, 8).map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt=""
                          className="h-6 w-6 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-black/40 dark:text-white/40">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black/70 dark:text-white/70 truncate">
                          {member.name}
                        </p>
                        <p className="text-[10px] text-black/30 dark:text-white/30">
                          {member.docs} page{member.docs !== 1 ? "s" : ""}
                          {member.edits > 0 && (
                            <span className="text-blue-500"> · {member.edits} edit{member.edits !== 1 ? "s" : ""} this week</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Agents */}
            {data.agents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
                    AI Agents
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-2 rounded-full border border-black/6 dark:border-white/8 pl-1 pr-3 py-1"
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.avatar}
                      </div>
                      <span className="text-[11px] text-black/60 dark:text-white/60">
                        {agent.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => router.push(`/${workspaceId}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-black/6 dark:border-white/8 px-3 py-2 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/15 dark:hover:border-white/15 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open Wiki
                </button>
                <button
                  onClick={() => router.push(`/${workspaceId}/calls`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-black/6 dark:border-white/8 px-3 py-2 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/15 dark:hover:border-white/15 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call Log
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${color || "text-black/30 dark:text-white/30"}`} />
        <span className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-black dark:text-white tracking-tight">{value}</p>
      {sub && (
        <p className="text-[10px] text-black/30 dark:text-white/30 mt-0.5">{sub}</p>
      )}
    </div>
  );
}
