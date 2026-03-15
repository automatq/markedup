"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
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
  BarChart3,
  ArrowRight,
  RefreshCw,
  Brain,
  GitCommit,
  Target,
  Signal,
  Zap,
  Clock,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ──────────────────── Types ──────────────────── */

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
  dailyTimeline: { date: string; edits: number; created: number; breakouts: number }[];
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

interface InsightsData {
  signalNoise?: {
    overall: { signal: number; noise: number; summary: string };
    members: { name: string; signal: number; noise: number; insight: string }[];
    categories: { category: string; signal: number; noise: number }[];
  };
  visionTracker?: {
    shortTerm: { score: number; label: string; items: string[] };
    longTerm: { score: number; label: string; items: string[] };
    alignment: number;
    insight: string;
  };
  workflowLog?: { date: string; author: string; type: string; summary: string; impact: string }[];
  recommendations?: string[];
  generatedAt?: string;
  empty?: boolean;
}

interface GitHubData {
  configured: boolean;
  repos?: { id: string; name: string }[];
  activeRepo?: string;
  totalCommits?: number;
  commits?: { sha: string; message: string; author: string; authorAvatar?: string; date: string; repo: string; url: string }[];
  timeline?: { date: string; commits: number; authors: number }[];
  authors?: { name: string; avatar?: string; commits: number }[];
}

interface KpiItem {
  id: string;
  userId: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  week: string;
  category: string;
}

interface KpiData {
  week: string;
  currentWeek: string;
  members: { userId: string; kpis: KpiItem[] }[];
  all: KpiItem[];
}

interface AgentMonitorItem {
  agent: { id: string; name: string; title: string; roleId: string; color: string; avatar: string };
  monitor: { id: string; enabled: boolean; watchList: string[]; frequency: string; lastRunAt: string | null } | null;
}

/* ──────────────────── Chart configs ──────────────────── */

const activityChartConfig = {
  edits: { label: "Edits", color: "var(--chart-1)" },        // gold
  created: { label: "Created", color: "var(--chart-2)" },    // silver
  breakouts: { label: "Breakouts", color: "var(--chart-3)" }, // copper
} satisfies ChartConfig;

const signalNoiseChartConfig = {
  signal: { label: "Signal", color: "var(--chart-1)" },  // gold
  noise: { label: "Noise", color: "var(--chart-5)" },    // muted bronze
} satisfies ChartConfig;

const visionChartConfig = {
  shortTerm: { label: "Short-term", color: "var(--chart-1)" },
  longTerm: { label: "Long-term", color: "var(--chart-2)" },
} satisfies ChartConfig;

/* ──────────────────── Helpers ──────────────────── */

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
  const cls = "h-3.5 w-3.5 text-black/40 dark:text-white/40";
  switch (type) {
    case "doc_created": return <Plus className={cls} />;
    case "doc_updated": return <Edit3 className={cls} />;
    case "breakout": return <Sparkles className={cls} />;
    case "call": return <Phone className={cls} />;
    case "view": return <Eye className={cls} />;
  }
}

function activityColor(_type: ActivityItem["type"]): string {
  return "bg-black/[0.03] dark:bg-white/[0.03] border-black/6 dark:border-white/8";
}

function impactColor(impact: string) {
  switch (impact) {
    case "high": return "text-black/60 dark:text-white/60 bg-black/[0.04] dark:bg-white/[0.04]";
    case "medium": return "text-black/40 dark:text-white/40 bg-black/[0.03] dark:bg-white/[0.03]";
    case "low": return "text-black/25 dark:text-white/25 bg-black/[0.02] dark:bg-white/[0.02]";
    default: return "text-black/25 dark:text-white/25 bg-black/[0.02] dark:bg-white/[0.02]";
  }
}

/** GitHub-style contribution calendar */
function ContributionCalendar({ timeline }: { timeline: { date: string; commits: number }[] }) {
  // Build 52 weeks of data ending today
  const today = new Date();
  const cells: { date: string; count: number; dayOfWeek: number }[] = [];
  const countMap = new Map(timeline.map((d) => [d.date, d.commits]));

  // Go back ~364 days to fill 52 weeks
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: countMap.get(key) || 0, dayOfWeek: d.getDay() });
  }

  // Group into weeks (columns)
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  for (const cell of cells) {
    if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(cell);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const max = Math.max(1, ...cells.map((c) => c.count));

  function cellOpacity(count: number): string {
    if (count === 0) return "bg-black/[0.03] dark:bg-white/[0.04]";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-black/[0.10] dark:bg-white/[0.10]";
    if (ratio < 0.5) return "bg-black/[0.20] dark:bg-white/[0.20]";
    if (ratio < 0.75) return "bg-black/[0.35] dark:bg-white/[0.35]";
    return "bg-black/[0.55] dark:bg-white/[0.55]";
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="overflow-x-auto">
      {/* Month labels */}
      <div className="flex gap-[3px] mb-1 ml-[18px]">
        {weeks.map((week, wi) => {
          const firstDay = week[0];
          const d = new Date(firstDay.date);
          const showLabel = d.getDate() <= 7 && wi > 0;
          return (
            <div key={wi} className="w-[11px] shrink-0">
              {showLabel && (
                <span className="text-[8px] text-black/25 dark:text-white/25">{months[d.getMonth()]}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-[2px]">
          {["","M","","W","","F",""].map((label, i) => (
            <div key={i} className="h-[11px] flex items-center">
              <span className="text-[8px] text-black/20 dark:text-white/20 w-3">{label}</span>
            </div>
          ))}
        </div>
        {/* Weeks grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const cell = week.find((c) => c.dayOfWeek === dayIdx);
              if (!cell) return <div key={dayIdx} className="h-[11px] w-[11px]" />;
              return (
                <div
                  key={dayIdx}
                  className={`h-[11px] w-[11px] rounded-[2px] ${cellOpacity(cell.count)} transition-colors`}
                  title={`${cell.date}: ${cell.count} commit${cell.count !== 1 ? "s" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[8px] text-black/20 dark:text-white/20 mr-0.5">Less</span>
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.03] dark:bg-white/[0.04]" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.10] dark:bg-white/[0.10]" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.20] dark:bg-white/[0.20]" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.35] dark:bg-white/[0.35]" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.55] dark:bg-white/[0.55]" />
        <span className="text-[8px] text-black/20 dark:text-white/20 ml-0.5">More</span>
      </div>
    </div>
  );
}

function workflowIcon(type: string) {
  switch (type) {
    case "commit": return <GitCommit className="h-3 w-3" />;
    case "doc": return <FileText className="h-3 w-3" />;
    case "breakout": return <Sparkles className="h-3 w-3" />;
    case "call": return <Phone className="h-3 w-3" />;
    default: return <Activity className="h-3 w-3" />;
  }
}

/* ──────────────────── Main Component ──────────────────── */

export default function OverviewPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  // Insights state
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // GitHub state — default to unconfigured so the connect card shows immediately
  const [github, setGitHub] = useState<GitHubData>({ configured: false });
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [activeRepo, setActiveRepo] = useState("all");

  // GitHub config modal
  const [showGitHubConfig, setShowGitHubConfig] = useState(false);
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghSaving, setGhSaving] = useState(false);
  const [ghError, setGhError] = useState("");

  // KPI state
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [kpiName, setKpiName] = useState("");
  const [kpiTarget, setKpiTarget] = useState("");
  const [kpiUnit, setKpiUnit] = useState("");
  const [kpiUserId, setKpiUserId] = useState("");
  const [kpiCategory, setKpiCategory] = useState("output");

  // Agent monitor state
  const [agentMonitors, setAgentMonitors] = useState<AgentMonitorItem[]>([]);
  const [showAgentMonitors, setShowAgentMonitors] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/overview?workspaceId=${workspaceId}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [workspaceId]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/overview/insights?workspaceId=${workspaceId}`);
      if (res.ok) {
        const result = await res.json();
        if (!result.empty) setInsights(result);
      }
    } catch {}
    setInsightsLoading(false);
  }, [workspaceId]);

  const fetchGitHub = useCallback(async (repo?: string) => {
    try {
      const repoParam = repo ?? activeRepo;
      const res = await fetch(`/api/github/activity?workspaceId=${workspaceId}&repo=${encodeURIComponent(repoParam)}`);
      if (res.ok) setGitHub(await res.json());
    } catch {}
  }, [workspaceId, activeRepo]);

  const generateInsights = useCallback(async () => {
    setGeneratingInsights(true);
    try {
      const res = await fetch("/api/overview/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) setInsights(await res.json());
    } catch {}
    setGeneratingInsights(false);
  }, [workspaceId]);

  const saveGitHubConfig = useCallback(async () => {
    setGhSaving(true);
    setGhError("");
    try {
      const res = await fetch("/api/github/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, owner: ghOwner, repo: ghRepo, token: ghToken || undefined }),
      });
      if (res.ok) {
        setShowGitHubConfig(false);
        setGhOwner("");
        setGhRepo("");
        setGhToken("");
        fetchGitHub("all");
      } else {
        const data = await res.json().catch(() => ({}));
        setGhError(data.error || `Failed to connect (${res.status})`);
      }
    } catch (e) {
      setGhError("Network error — check your connection and try again.");
    }
    setGhSaving(false);
  }, [workspaceId, ghOwner, ghRepo, ghToken, fetchGitHub]);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch(`/api/kpis?workspaceId=${workspaceId}`);
      if (res.ok) setKpiData(await res.json());
    } catch {}
  }, [workspaceId]);

  const fetchAgentMonitors = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/monitor?workspaceId=${workspaceId}`);
      if (res.ok) {
        const d = await res.json();
        setAgentMonitors(d.agents || []);
      }
    } catch {}
  }, [workspaceId]);

  const addKpi = useCallback(async () => {
    if (!kpiName || !kpiTarget || !kpiUserId) return;
    try {
      const res = await fetch("/api/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          userId: kpiUserId,
          name: kpiName,
          target: parseFloat(kpiTarget),
          unit: kpiUnit,
          category: kpiCategory,
        }),
      });
      if (res.ok) {
        setKpiName("");
        setKpiTarget("");
        setKpiUnit("");
        setShowAddKpi(false);
        fetchKpis();
      }
    } catch {}
  }, [workspaceId, kpiName, kpiTarget, kpiUnit, kpiUserId, kpiCategory, fetchKpis]);

  const updateKpiActual = useCallback(async (id: string, actual: number) => {
    try {
      await fetch("/api/kpis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, actual }),
      });
      fetchKpis();
    } catch {}
  }, [fetchKpis]);

  const deleteKpi = useCallback(async (id: string) => {
    try {
      await fetch(`/api/kpis?id=${id}`, { method: "DELETE" });
      fetchKpis();
    } catch {}
  }, [fetchKpis]);

  const toggleAgentMonitor = useCallback(async (agentConfigId: string, enabled: boolean) => {
    try {
      await fetch("/api/agents/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, agentConfigId, enabled }),
      });
      fetchAgentMonitors();
    } catch {}
  }, [workspaceId, fetchAgentMonitors]);

  const removeGitHubRepo = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/github/activity?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchGitHub("all");
    } catch {}
  }, [fetchGitHub]);

  const switchRepo = useCallback((repo: string) => {
    setActiveRepo(repo);
    fetchGitHub(repo);
  }, [fetchGitHub]);

  useEffect(() => {
    fetchOverview();
    fetchInsights();
    fetchGitHub();
    fetchKpis();
    fetchAgentMonitors();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview, fetchInsights, fetchGitHub, fetchKpis, fetchAgentMonitors]);

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

  const chartData = (() => {
    const timeline = data.dailyTimeline || [];
    const daysToShow = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
    return timeline.slice(-daysToShow);
  })();

  const sn = insights?.signalNoise;
  const vt = insights?.visionTracker;

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
          <div className="flex items-center gap-2">
            <button
              onClick={generateInsights}
              disabled={generatingInsights}
              className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {generatingInsights ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3" />
                  {insights ? "Refresh Insights" : "Generate Insights"}
                </>
              )}
            </button>
            <button
              onClick={() => { setLoading(true); fetchOverview(); }}
              className="flex items-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 px-3 py-1.5 text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={FileText} label="Total Pages" value={data.stats.totalDocs}
            sub={data.stats.docsCreatedThisWeek > 0 ? `+${data.stats.docsCreatedThisWeek} this week` : undefined} />
          <StatCard icon={TrendingUp} label="Active This Week" value={data.stats.docsEditedThisWeek}
            sub="pages edited" />
          <StatCard icon={Users} label="Contributors" value={data.stats.uniqueContributors}
            sub={data.stats.agentCount > 0 ? `${data.stats.agentCount} AI agent${data.stats.agentCount > 1 ? "s" : ""}` : undefined} />
          <StatCard icon={Activity} label="This Week" value={data.stats.totalBreakouts + data.stats.totalCalls}
            sub={`${data.stats.totalBreakouts} breakouts, ${data.stats.totalCalls} calls`} />
        </div>

        {/* ═══════ SIGNAL / NOISE + VISION TRACKER ROW ═══════ */}
        {sn && vt && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

            {/* Signal vs Noise */}
            <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-black/40 dark:text-white/40" />
                  <CardTitle className="text-sm font-semibold text-black dark:text-white">
                    Signal vs Noise
                  </CardTitle>
                </div>
                <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                  {sn.overall.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Overall gauge */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-black/40 dark:text-white/40 mb-1">
                      <span>Signal {sn.overall.signal}%</span>
                      <span>Noise {sn.overall.noise}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
                      <div
                        className="h-full rounded-l-full bg-black/30 dark:bg-white/40 transition-all"
                        style={{ width: `${sn.overall.signal}%` }}
                      />
                      <div
                        className="h-full rounded-r-full bg-black/10 dark:bg-white/10 transition-all"
                        style={{ width: `${sn.overall.noise}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                <ChartContainer config={signalNoiseChartConfig} className="h-[160px] w-full">
                  <BarChart
                    data={sn.categories}
                    layout="vertical"
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  >
                    <YAxis
                      dataKey="category"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      className="text-[10px] fill-black/40 dark:fill-white/40"
                    />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                    <Bar dataKey="signal" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                    <Bar dataKey="noise" fill="var(--chart-5)" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                  </BarChart>
                </ChartContainer>

                {/* Member signal/noise */}
                {sn.members.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {sn.members.map((m) => (
                      <div key={m.name} className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-black/60 dark:text-white/60 w-20 truncate shrink-0">
                          {m.name}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
                          <div className="h-full bg-black/30 dark:bg-white/40 transition-all" style={{ width: `${m.signal}%` }} />
                          <div className="h-full bg-black/10 dark:bg-white/10 transition-all" style={{ width: `${m.noise}%` }} />
                        </div>
                        <span className="text-[9px] text-black/30 dark:text-white/30 w-8 text-right shrink-0">
                          {m.signal}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vision Tracker */}
            <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-black/40 dark:text-white/40" />
                  <CardTitle className="text-sm font-semibold text-black dark:text-white">
                    Vision Tracker
                  </CardTitle>
                </div>
                <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                  Short-term execution vs long-term strategic alignment
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Radial alignment gauge */}
                <div className="flex items-center justify-center mb-4">
                  <ChartContainer config={visionChartConfig} className="h-[120px] w-[120px]">
                    <RadialBarChart
                      innerRadius="60%"
                      outerRadius="100%"
                      data={[
                        { name: "Long-term", value: vt.longTerm.score, fill: "var(--chart-2)" },
                        { name: "Short-term", value: vt.shortTerm.score, fill: "var(--chart-1)" },
                      ]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background={{ fill: "rgba(0,0,0,0.03)" }}
                        dataKey="value"
                        cornerRadius={6}
                      />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="ml-4">
                    <div className="text-3xl font-bold text-black dark:text-white">{vt.alignment}%</div>
                    <div className="text-[10px] text-black/40 dark:text-white/40">alignment</div>
                  </div>
                </div>

                {/* Short-term / Long-term breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-black/6 dark:border-white/8 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="h-3 w-3 text-black/30 dark:text-white/30" />
                      <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
                        Short-term
                      </span>
                      <span className="ml-auto text-sm font-bold text-black dark:text-white">{vt.shortTerm.score}%</span>
                    </div>
                    <p className="text-[11px] text-black/50 dark:text-white/50 font-medium mb-1.5">{vt.shortTerm.label}</p>
                    <ul className="space-y-0.5">
                      {vt.shortTerm.items.map((item, i) => (
                        <li key={i} className="text-[10px] text-black/40 dark:text-white/40 flex items-start gap-1">
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-black/30 dark:bg-white/30 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-black/6 dark:border-white/8 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="h-3 w-3 text-black/30 dark:text-white/30" />
                      <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
                        Long-term
                      </span>
                      <span className="ml-auto text-sm font-bold text-black dark:text-white">{vt.longTerm.score}%</span>
                    </div>
                    <p className="text-[11px] text-black/50 dark:text-white/50 font-medium mb-1.5">{vt.longTerm.label}</p>
                    <ul className="space-y-0.5">
                      {vt.longTerm.items.map((item, i) => (
                        <li key={i} className="text-[10px] text-black/40 dark:text-white/40 flex items-start gap-1">
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-black/30 dark:bg-white/30 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Insight */}
                <p className="mt-3 text-[11px] text-black/50 dark:text-white/50 leading-relaxed italic">
                  {vt.insight}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        {insights?.recommendations && insights.recommendations.length > 0 && (
          <div className="mb-6 rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-semibold text-black/70 dark:text-white/70">AI Recommendations</span>
              {insights.generatedAt && (
                <span className="text-[9px] text-black/25 dark:text-white/25 ml-auto">
                  Generated {timeAgo(insights.generatedAt)}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-black/60 dark:text-white/55 leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activity Chart */}
        <Card className="pt-0 mb-6 border-black/6 dark:border-white/8 bg-transparent shadow-none">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b border-black/6 dark:border-white/8 py-4 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle className="text-sm font-semibold text-black dark:text-white">
                Workspace Activity
              </CardTitle>
              <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                Document edits, pages created, and AI breakouts over time
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(v) => { if (v) setTimeRange(v); }}>
              <SelectTrigger
                className="hidden w-[140px] rounded-lg text-xs sm:ml-auto sm:flex border-black/8 dark:border-white/10"
                aria-label="Select time range"
              >
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30d" className="rounded-lg text-xs">Last 30 days</SelectItem>
                <SelectItem value="14d" className="rounded-lg text-xs">Last 14 days</SelectItem>
                <SelectItem value="7d" className="rounded-lg text-xs">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={activityChartConfig} className="aspect-auto h-[220px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillEdits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-edits)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-edits)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-created)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillBreakouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-breakouts)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-breakouts)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-black/[0.06] dark:stroke-white/[0.06]" />
                <XAxis
                  dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                  className="text-[10px] fill-black/30 dark:fill-white/30"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      indicator="dot"
                    />
                  }
                />
                <Area dataKey="edits" type="natural" fill="url(#fillEdits)" stroke="var(--color-edits)" strokeWidth={2} stackId="a" />
                <Area dataKey="created" type="natural" fill="url(#fillCreated)" stroke="var(--color-created)" strokeWidth={2} stackId="a" />
                <Area dataKey="breakouts" type="natural" fill="url(#fillBreakouts)" stroke="var(--color-breakouts)" strokeWidth={2} stackId="a" />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ═══════ WORKFLOW LOG ═══════ */}
        {insights?.workflowLog && insights.workflowLog.length > 0 && (
          <Card className="pt-0 mb-6 border-black/6 dark:border-white/8 bg-transparent shadow-none">
            <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-black/40 dark:text-white/40" />
                <CardTitle className="text-sm font-semibold text-black dark:text-white">
                  Workflow Log
                </CardTitle>
              </div>
              <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                AI-tracked activity across all team members
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3 max-h-[400px] overflow-y-auto">
              <div className="space-y-0.5">
                {insights.workflowLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-1 py-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <div className="mt-0.5 text-black/25 dark:text-white/25">
                      {workflowIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-black/60 dark:text-white/60 leading-snug">
                        <span className="font-medium text-black/80 dark:text-white/80">{entry.author}</span>
                        {" "}{entry.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${impactColor(entry.impact)}`}>
                        {entry.impact}
                      </span>
                      <span className="text-[9px] text-black/20 dark:text-white/20">
                        {entry.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════ GITHUB ACTIVITY — FULL WIDTH ═══════ */}
        {github?.configured && (
          <Card className="pt-0 mb-6 border-black/6 dark:border-white/8 bg-transparent shadow-none">
            <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <GitCommit className="h-4 w-4 text-black/40 dark:text-white/40" />
                <CardTitle className="text-sm font-semibold text-black dark:text-white">
                  GitHub Activity
                </CardTitle>

                {/* Repo switcher */}
                {github.repos && github.repos.length > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => switchRepo("all")}
                      className={`text-[10px] rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                        activeRepo === "all"
                          ? "bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70"
                          : "text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"
                      }`}
                    >
                      All Projects
                    </button>
                    {github.repos.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => switchRepo(r.name)}
                        className={`text-[10px] rounded-full px-2.5 py-0.5 font-medium transition-colors ${
                          activeRepo === r.name
                            ? "bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70"
                            : "text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"
                        }`}
                      >
                        {r.name.split("/")[1] || r.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <span className="text-[10px] text-black/25 dark:text-white/25">
                    {github.totalCommits} commits
                  </span>
                  <button
                    onClick={() => setShowGitHubConfig(true)}
                    className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Repo
                  </button>
                </div>
              </div>
              <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                {activeRepo === "all" ? "Combined activity across all connected repositories" : activeRepo}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Contribution calendar — full width */}
              {github.timeline && github.timeline.length > 0 && (
                <div className="mb-5">
                  <ContributionCalendar timeline={github.timeline} />
                </div>
              )}

              {/* Author breakdown + repo management */}
              <div className="flex items-start gap-6 mb-4 flex-wrap">
                {github.authors && github.authors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {github.authors.map((a) => (
                      <div key={a.name} className="flex items-center gap-1.5 rounded-full border border-black/6 dark:border-white/8 pl-1 pr-2.5 py-0.5">
                        {a.avatar ? (
                          <img src={a.avatar} alt="" className="h-4 w-4 rounded-full" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-black/8 dark:bg-white/8 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-black/40 dark:text-white/40">{a.name.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-black/50 dark:text-white/50">{a.name}</span>
                        <span className="text-[9px] text-black/25 dark:text-white/25">{a.commits}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connected repos list with remove */}
                {github.repos && github.repos.length > 1 && activeRepo === "all" && (
                  <div className="flex flex-wrap gap-1.5 ml-auto">
                    {github.repos.map((r) => (
                      <div key={r.id} className="flex items-center gap-1 rounded-full border border-black/6 dark:border-white/8 pl-2.5 pr-1 py-0.5">
                        <span className="text-[9px] text-black/35 dark:text-white/35">{r.name}</span>
                        <button
                          onClick={() => removeGitHubRepo(r.id)}
                          className="text-black/15 dark:text-white/15 hover:text-red-500 transition-colors p-0.5"
                          title={`Remove ${r.name}`}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent commits */}
              <div className="max-h-[320px] overflow-y-auto space-y-0.5">
                {github.commits?.slice(0, githubExpanded ? 50 : 10).map((c) => (
                  <a
                    key={c.sha + c.repo}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-1 py-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group"
                  >
                    <code className="text-[10px] text-black/40 dark:text-white/40 font-mono mt-0.5 shrink-0">{c.sha}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-black/60 dark:text-white/60 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                        {c.message}
                      </p>
                      <p className="text-[9px] text-black/25 dark:text-white/25">
                        {c.author} · {c.repo.split("/")[1]} · {new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
              {github.commits && github.commits.length > 10 && (
                <button
                  onClick={() => setGithubExpanded(!githubExpanded)}
                  className="mt-2 text-[10px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                >
                  {githubExpanded ? "Show less" : `Show all ${github.commits.length} commits`}
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* GitHub Setup Card — shows when not configured, or when "Add Repo" is clicked */}
        {(!github.configured || showGitHubConfig) && (
          <div className="mb-6">
            {showGitHubConfig || github.configured ? (
              <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
                <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                  <div className="flex items-center gap-2">
                    <GitCommit className="h-4 w-4 text-black/40 dark:text-white/40" />
                    <CardTitle className="text-sm font-semibold text-black dark:text-white">
                      {github.configured ? "Add Another Repository" : "Connect GitHub Repository"}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">Owner</label>
                      <input
                        value={ghOwner}
                        onChange={(e) => setGhOwner(e.target.value)}
                        placeholder="e.g. automatq"
                        className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">Repository</label>
                      <input
                        value={ghRepo}
                        onChange={(e) => setGhRepo(e.target.value)}
                        placeholder="e.g. markedup"
                        className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">
                      Personal Access Token <span className="normal-case">(optional, for private repos)</span>
                    </label>
                    <input
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      type="password"
                      placeholder="ghp_... or github_pat_..."
                      className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30"
                    />
                  </div>
                  {ghError && (
                    <p className="text-[11px] text-red-500 mb-2">{ghError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={saveGitHubConfig}
                      disabled={ghSaving || !ghOwner || !ghRepo}
                      className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-4 py-1.5 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {ghSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCommit className="h-3 w-3" />}
                      Connect
                    </button>
                    <button
                      onClick={() => { setShowGitHubConfig(false); setGhError(""); }}
                      className="rounded-lg border border-black/8 dark:border-white/10 px-4 py-1.5 text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <button
                onClick={() => setShowGitHubConfig(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 hover:border-black/20 dark:hover:border-white/20 transition-colors group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 group-hover:bg-black/8 dark:group-hover:bg-white/8 transition-colors">
                  <GitCommit className="h-4 w-4 text-black/30 dark:text-white/30" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">
                    Connect GitHub Repository
                  </p>
                  <p className="text-[10px] text-black/30 dark:text-white/30">
                    Track commits and let your CTO agent analyze development workflow automatically
                  </p>
                </div>
                <Settings className="h-3.5 w-3.5 text-black/15 dark:text-white/15 ml-auto group-hover:text-black/40 dark:group-hover:text-white/40 transition-colors" />
              </button>
            )}
          </div>
        )}

        {/* ═══════ TEAM SCORECARDS + KPIs ═══════ */}
        <Card className="pt-0 mb-6 border-black/6 dark:border-white/8 bg-transparent shadow-none">
          <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-black/40 dark:text-white/40" />
              <CardTitle className="text-sm font-semibold text-black dark:text-white">
                Team Scorecards
              </CardTitle>
              <span className="text-[10px] text-black/25 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5 ml-1">
                {kpiData?.week || "This Week"}
              </span>
              <button
                onClick={() => setShowAddKpi(!showAddKpi)}
                className="ml-auto flex items-center gap-1 text-[10px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add KPI
              </button>
            </div>
            <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
              Weekly targets and signal strength for each team member
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Add KPI form */}
            {showAddKpi && (
              <div className="mb-4 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  <div>
                    <label className="text-[9px] text-black/40 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Member</label>
                    <select
                      value={kpiUserId}
                      onChange={(e) => setKpiUserId(e.target.value)}
                      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-[11px] text-black dark:text-white outline-none"
                    >
                      <option value="">Select...</option>
                      {data.memberActivity.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-black/40 dark:text-white/40 uppercase tracking-wider mb-0.5 block">KPI Name</label>
                    <input value={kpiName} onChange={(e) => setKpiName(e.target.value)} placeholder="e.g. Docs Created"
                      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-[11px] text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-black/40 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Target</label>
                    <input value={kpiTarget} onChange={(e) => setKpiTarget(e.target.value)} type="number" placeholder="10"
                      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-[11px] text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-black/40 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Unit</label>
                    <input value={kpiUnit} onChange={(e) => setKpiUnit(e.target.value)} placeholder="docs"
                      className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-[11px] text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={addKpi} disabled={!kpiName || !kpiTarget || !kpiUserId}
                      className="w-full rounded-md bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-40">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Member scorecards */}
            {data.memberActivity.length > 0 ? (
              <div className="space-y-4">
                {data.memberActivity.map((member) => {
                  const memberKpis = kpiData?.all.filter((k) => k.userId === member.userId) || [];
                  const snMember = sn?.members.find((m) => m.name === member.name);
                  const totalTarget = memberKpis.reduce((s, k) => s + k.target, 0);
                  const totalActual = memberKpis.reduce((s, k) => s + k.actual, 0);
                  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalActual / totalTarget) * 100)) : null;

                  return (
                    <div key={member.userId} className="rounded-xl border border-black/6 dark:border-white/8 p-4">
                      {/* Member header */}
                      <div className="flex items-center gap-3 mb-3">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="h-8 w-8 rounded-full shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-black/40 dark:text-white/40">{member.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-black dark:text-white">{member.name}</p>
                          <p className="text-[10px] text-black/30 dark:text-white/30">
                            {member.docs} pages · {member.edits} edits this week
                          </p>
                        </div>

                        {/* Signal indicator */}
                        {snMember && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-black/30 dark:bg-white/40" />
                                <span className="text-[10px] text-black/40 dark:text-white/40">{snMember.signal}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/10" />
                                <span className="text-[10px] text-black/40 dark:text-white/40">{snMember.noise}%</span>
                              </div>
                            </div>
                            <div className="w-16 h-8">
                              <div className="h-full flex flex-col justify-center gap-0.5">
                                <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                  <div className="h-full bg-black/30 dark:bg-white/40 rounded-full transition-all" style={{ width: `${snMember.signal}%` }} />
                                </div>
                                <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                  <div className="h-full bg-black/10 dark:bg-white/10 rounded-full transition-all" style={{ width: `${snMember.noise}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall KPI progress */}
                        {overallProgress !== null && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {overallProgress >= 80 ? (
                              <CheckCircle2 className="h-4 w-4 text-black/50 dark:text-white/50" />
                            ) : overallProgress >= 50 ? (
                              <AlertTriangle className="h-4 w-4 text-black/30 dark:text-white/30" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-black/20 dark:text-white/20" />
                            )}
                            <span className={`text-sm font-bold ${
                              overallProgress >= 80 ? "text-black/70 dark:text-white/70" : overallProgress >= 50 ? "text-black/40 dark:text-white/40" : "text-black/25 dark:text-white/25"
                            }`}>
                              {overallProgress}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* KPIs */}
                      {memberKpis.length > 0 ? (
                        <div className="space-y-2">
                          {memberKpis.map((kpi) => {
                            const pct = kpi.target > 0 ? Math.min(100, Math.round((kpi.actual / kpi.target) * 100)) : 0;
                            const color = pct >= 80 ? "bg-black/40 dark:bg-white/50" : pct >= 50 ? "bg-black/20 dark:bg-white/25" : "bg-black/10 dark:bg-white/10";
                            return (
                              <div key={kpi.id} className="flex items-center gap-3">
                                <span className="text-[11px] text-black/50 dark:text-white/50 w-28 truncate shrink-0">{kpi.name}</span>
                                <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                  <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <input
                                    type="number"
                                    value={kpi.actual}
                                    onChange={(e) => updateKpiActual(kpi.id, parseFloat(e.target.value) || 0)}
                                    className="w-12 rounded border border-black/10 dark:border-white/10 bg-transparent px-1.5 py-0.5 text-[10px] text-black dark:text-white text-center outline-none focus:border-black/30 dark:focus:border-white/30"
                                  />
                                  <span className="text-[10px] text-black/25 dark:text-white/25">/ {kpi.target} {kpi.unit}</span>
                                  <button onClick={() => deleteKpi(kpi.id)} className="text-black/15 dark:text-white/15 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-black/20 dark:text-white/20 italic">
                          No KPIs set — click "Add KPI" to track targets for this member
                        </p>
                      )}

                      {/* Signal insight */}
                      {snMember?.insight && (
                        <p className="mt-2 text-[10px] text-black/35 dark:text-white/35 italic leading-relaxed">
                          {snMember.insight}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-black/30 dark:text-white/30 text-center py-6">
                No team members with activity yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* ═══════ AGENT MONITORING ═══════ */}
        {data.agents.length > 0 && (
          <Card className="pt-0 mb-6 border-black/6 dark:border-white/8 bg-transparent shadow-none">
            <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-black/40 dark:text-white/40" />
                <CardTitle className="text-sm font-semibold text-black dark:text-white">
                  Active Agent Monitoring
                </CardTitle>
                <button
                  onClick={() => setShowAgentMonitors(!showAgentMonitors)}
                  className="ml-auto text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showAgentMonitors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                Toggle agents to actively watch workspace activity and help you reach targets
              </CardDescription>
            </CardHeader>
            {showAgentMonitors && (
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {agentMonitors.map(({ agent, monitor }) => (
                    <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-black/6 dark:border-white/8 px-4 py-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black dark:text-white">{agent.name}</p>
                        <p className="text-[10px] text-black/35 dark:text-white/35">{agent.title}</p>
                      </div>

                      {/* Frequency badge */}
                      {monitor?.enabled && (
                        <span className="text-[9px] text-black/40 dark:text-white/40 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5 font-medium shrink-0">
                          {monitor.frequency}
                        </span>
                      )}

                      {/* Last run */}
                      {monitor?.lastRunAt && (
                        <span className="text-[9px] text-black/20 dark:text-white/20 shrink-0">
                          Last: {timeAgo(monitor.lastRunAt)}
                        </span>
                      )}

                      {/* Toggle */}
                      <button
                        onClick={() => toggleAgentMonitor(agent.id, !monitor?.enabled)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-all shrink-0 border ${
                          monitor?.enabled
                            ? "bg-black/[0.06] dark:bg-white/[0.06] text-black/60 dark:text-white/60 border-black/15 dark:border-white/15"
                            : "bg-black/[0.02] dark:bg-white/[0.02] text-black/25 dark:text-white/25 border-black/6 dark:border-white/8"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {monitor?.enabled ? "Active" : "Off"}
                      </button>
                    </div>
                  ))}
                </div>

                {agentMonitors.some((a) => a.monitor?.enabled) && (
                  <p className="mt-3 text-[10px] text-black/30 dark:text-white/30 leading-relaxed">
                    Active agents will analyze workspace activity, track KPI progress, and generate reports
                    to help your team stay on target. Agents run on their configured frequency.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* ═══════ ACTIVITY FEED + SIDEBAR ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-black/30 dark:text-white/30" />
              <h2 className="text-sm font-semibold text-black dark:text-white">Activity Feed</h2>
              <span className="text-[10px] text-black/25 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">Last 7 days</span>
            </div>
            {data.activity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-10 text-center">
                <Activity className="h-6 w-6 text-black/10 dark:text-white/10 mx-auto mb-3" />
                <p className="text-sm text-black/30 dark:text-white/30">No recent activity</p>
                <p className="text-[11px] text-black/20 dark:text-white/20 mt-1">Activity from the last 7 days will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.activity.map((item, i) => (
                  <div key={i} className="group flex items-start gap-3 rounded-xl px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-default">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${activityColor(item.type)}`}>
                      <ActivityIcon type={item.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-black/70 dark:text-white/70 leading-snug">
                        {item.userName && <span className="font-medium text-black dark:text-white">{item.userName} </span>}
                        {item.title}
                      </p>
                      {item.subtitle && <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{item.subtitle}</p>}
                    </div>
                    <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Popular Pages */}
            {data.popularDocs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Most Viewed</h3>
                </div>
                <div className="rounded-xl border border-black/6 dark:border-white/8 divide-y divide-black/5 dark:divide-white/5">
                  {data.popularDocs.map((doc) => (
                    <button key={doc.id} onClick={() => router.push(`/${workspaceId}/${doc.id}`)}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group first:rounded-t-xl last:rounded-b-xl">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-black/20 dark:text-white/20" />
                      <span className="flex-1 truncate text-xs text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">{doc.title || "Untitled"}</span>
                      <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0 flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{doc.views}</span>
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
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Team Activity</h3>
                </div>
                <div className="rounded-xl border border-black/6 dark:border-white/8 divide-y divide-black/5 dark:divide-white/5">
                  {data.memberActivity.slice(0, 8).map((member) => (
                    <div key={member.userId} className="flex items-center gap-2.5 px-3.5 py-2.5 first:rounded-t-xl last:rounded-b-xl">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="h-6 w-6 rounded-full shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-black/40 dark:text-white/40">{member.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black/70 dark:text-white/70 truncate">{member.name}</p>
                        <p className="text-[10px] text-black/30 dark:text-white/30">
                          {member.docs} page{member.docs !== 1 ? "s" : ""}
                          {member.edits > 0 && <span className="text-black/50 dark:text-white/50"> · {member.edits} edit{member.edits !== 1 ? "s" : ""} this week</span>}
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
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">AI Agents</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 rounded-full border border-black/6 dark:border-white/8 pl-1 pr-3 py-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: agent.color }}>
                        {agent.avatar}
                      </div>
                      <span className="text-[11px] text-black/60 dark:text-white/60">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="space-y-1.5">
                <button onClick={() => router.push(`/${workspaceId}`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-black/6 dark:border-white/8 px-3 py-2 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/15 dark:hover:border-white/15 transition-colors">
                  <FileText className="h-3.5 w-3.5" /> Open Wiki
                </button>
                <button onClick={() => router.push(`/${workspaceId}/calls`)}
                  className="flex w-full items-center gap-2 rounded-lg border border-black/6 dark:border-white/8 px-3 py-2 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/15 dark:hover:border-white/15 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> Call Log
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
        <span className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-black dark:text-white tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-black/30 dark:text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}
