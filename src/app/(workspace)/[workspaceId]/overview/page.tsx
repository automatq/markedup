"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Power,
  Info,
  TrendingDown,
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
    wow?: { docsCreated: number; breakouts: number; calls: number };
  };
  callStats: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number;
    thisWeek: number;
  };
  dailyCalls: { date: string; positive: number; neutral: number; negative: number }[];
  activity: ActivityItem[];
  popularDocs: { id: string; title: string; views: number }[];
  memberActivity: { userId: string; name: string; avatar?: string; docs: number; edits: number }[];
  agents: { id: string; name: string; title: string; color: string; avatar: string; roleId: string }[];
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

interface RoleAssignmentItem {
  id: string;
  userId: string;
  agentConfigId: string;
  agentConfig: { id: string; roleId: string; name: string; title: string; color: string; avatar: string };
}

interface AgentDigest {
  agentId: string;
  roleId: string;
  id: string;
  createdAt: string;
  payload: {
    summary?: string;
    alerts?: { level: "info" | "warning" | "critical"; message: string }[];
    metrics?: { activityScore?: number; trendDirection?: string; keyInsight?: string };
    recommendations?: string[];
  };
}

/* ──────────────────── Chart configs ──────────────────── */

const activityChartConfig = {
  edits: { label: "Edits", color: "var(--chart-1)" },
  created: { label: "Created", color: "var(--chart-2)" },
  breakouts: { label: "Breakouts", color: "var(--chart-3)" },
} satisfies ChartConfig;

const signalNoiseChartConfig = {
  signal: { label: "Signal", color: "var(--chart-1)" },
  noise: { label: "Noise", color: "var(--chart-5)" },
} satisfies ChartConfig;

const visionChartConfig = {
  shortTerm: { label: "Short-term", color: "var(--chart-1)" },
  longTerm: { label: "Long-term", color: "var(--chart-2)" },
} satisfies ChartConfig;

const callChartConfig = {
  positive: { label: "Positive", color: "var(--chart-1)" },
  neutral: { label: "Neutral", color: "var(--chart-2)" },
  negative: { label: "Negative", color: "var(--chart-5)" },
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

function impactColor(impact: string) {
  switch (impact) {
    case "high": return "text-black/60 dark:text-white/60 bg-black/[0.04] dark:bg-white/[0.04]";
    case "medium": return "text-black/40 dark:text-white/40 bg-black/[0.03] dark:bg-white/[0.03]";
    default: return "text-black/25 dark:text-white/25 bg-black/[0.02] dark:bg-white/[0.02]";
  }
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

/** GitHub-style contribution calendar with gold accents */
function ContributionCalendar({ timeline }: { timeline: { date: string; commits: number }[] }) {
  const today = new Date();
  const cells: { date: string; count: number; dayOfWeek: number }[] = [];
  const countMap = new Map(timeline.map((d) => [d.date, d.commits]));

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: countMap.get(key) || 0, dayOfWeek: d.getDay() });
  }

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

  function cellColor(count: number): string {
    if (count === 0) return "bg-black/[0.03] dark:bg-white/[0.04]";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-[#c9a84c]/20 dark:bg-[#d4af37]/20";
    if (ratio < 0.5) return "bg-[#c9a84c]/40 dark:bg-[#d4af37]/40";
    if (ratio < 0.75) return "bg-[#c9a84c]/65 dark:bg-[#d4af37]/65";
    return "bg-[#c9a84c] dark:bg-[#d4af37]";
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="overflow-x-auto">
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
        <div className="flex flex-col gap-[3px] mr-[2px]">
          {["","M","","W","","F",""].map((label, i) => (
            <div key={i} className="h-[11px] flex items-center">
              <span className="text-[8px] text-black/20 dark:text-white/20 w-3">{label}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const cell = week.find((c) => c.dayOfWeek === dayIdx);
              if (!cell) return <div key={dayIdx} className="h-[11px] w-[11px]" />;
              return (
                <div
                  key={dayIdx}
                  className={`h-[11px] w-[11px] rounded-[2px] ${cellColor(cell.count)} transition-colors ${cell.count > 0 ? "cursor-pointer hover:ring-1 hover:ring-[#c9a84c]/50 dark:hover:ring-[#d4af37]/50" : ""}`}
                  title={`${cell.date}: ${cell.count} commit${cell.count !== 1 ? "s" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[8px] text-black/20 dark:text-white/20 mr-0.5">Less</span>
        <div className="h-[9px] w-[9px] rounded-[2px] bg-black/[0.03] dark:bg-white/[0.04]" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-[#c9a84c]/20 dark:bg-[#d4af37]/20" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-[#c9a84c]/40 dark:bg-[#d4af37]/40" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-[#c9a84c]/65 dark:bg-[#d4af37]/65" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-[#c9a84c] dark:bg-[#d4af37]" />
        <span className="text-[8px] text-black/20 dark:text-white/20 ml-0.5">More</span>
      </div>
    </div>
  );
}

/** Agent avatar badge */
function AgentBadge({ agent, monitor, onToggle }: {
  agent: { name: string; title: string; color: string; avatar: string };
  monitor?: { enabled: boolean; lastRunAt: string | null } | null;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: agent.color }}
      >
        {agent.avatar}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-black/70 dark:text-white/70">{agent.name}</span>
        <span className="text-[10px] text-black/30 dark:text-white/30 ml-1">{agent.title}</span>
      </div>
      {onToggle && (
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium transition-all border ml-auto shrink-0 ${
            monitor?.enabled
              ? "bg-[#c9a84c]/10 dark:bg-[#d4af37]/10 text-[#c9a84c] dark:text-[#d4af37] border-[#c9a84c]/20 dark:border-[#d4af37]/20"
              : "bg-black/[0.02] dark:bg-white/[0.02] text-black/25 dark:text-white/25 border-black/6 dark:border-white/8"
          }`}
        >
          <Power className="h-2.5 w-2.5" />
          {monitor?.enabled ? "Active" : "Off"}
        </button>
      )}
      {monitor?.enabled && monitor.lastRunAt && (
        <span className="text-[8px] text-black/20 dark:text-white/20 shrink-0">
          {timeAgo(monitor.lastRunAt)}
        </span>
      )}
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function OverviewPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  // Insights
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  // GitHub
  const [github, setGitHub] = useState<GitHubData>({ configured: false });
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [activeRepo, setActiveRepo] = useState("all");
  const [showGitHubConfig, setShowGitHubConfig] = useState(false);
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [ghSaving, setGhSaving] = useState(false);
  const [ghError, setGhError] = useState("");

  // KPIs
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [kpiName, setKpiName] = useState("");
  const [kpiTarget, setKpiTarget] = useState("");
  const [kpiUnit, setKpiUnit] = useState("");
  const [kpiUserId, setKpiUserId] = useState("");
  const [kpiCategory, setKpiCategory] = useState("output");

  // Agent monitors
  const [agentMonitors, setAgentMonitors] = useState<AgentMonitorItem[]>([]);

  // Role assignments
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentItem[]>([]);

  // Agent digests
  const [agentDigests, setAgentDigests] = useState<AgentDigest[]>([]);

  /* ── Data fetchers ── */

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

  const fetchRoleAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/assignments?workspaceId=${workspaceId}`);
      if (res.ok) {
        const d = await res.json();
        setRoleAssignments(d.assignments || []);
      }
    } catch {}
  }, [workspaceId]);

  const fetchDigests = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/digests?workspaceId=${workspaceId}`);
      if (res.ok) {
        const d = await res.json();
        setAgentDigests(d.digests || []);
      }
    } catch {}
  }, [workspaceId]);

  const assignRole = useCallback(async (memberUserId: string, agentConfigId: string) => {
    try {
      await fetch("/api/agents/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId: memberUserId, agentConfigId }),
      });
      fetchRoleAssignments();
    } catch {}
  }, [workspaceId, fetchRoleAssignments]);

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
    fetchRoleAssignments();
    fetchDigests();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview, fetchInsights, fetchGitHub, fetchKpis, fetchAgentMonitors, fetchRoleAssignments, fetchDigests]);

  /* ── Derived data ── */

  const findAgent = useCallback((roleId: string) => data?.agents.find((a) => a.roleId === roleId), [data?.agents]);
  const findMonitor = useCallback((agentId: string) => agentMonitors.find((m) => m.agent.id === agentId), [agentMonitors]);
  const findDigest = useCallback((roleId: string) => agentDigests.find((d) => d.roleId === roleId), [agentDigests]);

  const ceoAgent = useMemo(() => findAgent("ceo"), [findAgent]);
  const ctoAgent = useMemo(() => findAgent("cto"), [findAgent]);
  const croAgent = useMemo(() => findAgent("cro"), [findAgent]);

  const sn = insights?.signalNoise;
  const vt = insights?.visionTracker;

  // KPI attainment
  const allKpis = useMemo(() => kpiData?.all || [], [kpiData?.all]);
  const kpiAttainment = useMemo(() => {
    const totalTarget = allKpis.reduce((s, k) => s + k.target, 0);
    const totalActual = allKpis.reduce((s, k) => s + k.actual, 0);
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null;
  }, [allKpis]);

  // Days since last insight
  const daysSinceInsight = insights?.generatedAt
    ? Math.floor((Date.now() - new Date(insights.generatedAt).getTime()) / 86400000)
    : null;

  const daysToShow = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;

  const chartData = useMemo(
    () => (data?.dailyTimeline || []).slice(-daysToShow),
    [data?.dailyTimeline, daysToShow]
  );

  const callChartData = useMemo(
    () => (data?.dailyCalls || []).slice(-daysToShow),
    [data?.dailyCalls, daysToShow]
  );

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

        {/* ═══════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════ */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-black/30 dark:text-white/30 mb-3">
              <BarChart3 className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-widest font-medium">Command Center</span>
            </div>
            <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
              {data.workspace.name}
            </h1>
          </div>
          <button
            onClick={() => { setLoading(true); fetchOverview(); }}
            className="flex items-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 px-3 py-1.5 text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════
            PULSE BAR — single glanceable strip
        ═══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <PulseItem
            label="Signal"
            value={sn ? `${sn.overall.signal}%` : "—"}
            sub={sn ? sn.overall.summary.slice(0, 40) : "Generate insights"}
            accent={sn ? (sn.overall.signal >= 70) : false}
          />
          <PulseItem
            label="KPI Attainment"
            value={kpiAttainment !== null ? `${kpiAttainment}%` : "—"}
            sub={allKpis.length > 0 ? `${allKpis.length} active targets` : "No KPIs set"}
            accent={kpiAttainment !== null && kpiAttainment >= 80}
          />
          <PulseItem
            label="Active This Week"
            value={data.stats.docsEditedThisWeek}
            sub={`${data.stats.docsCreatedThisWeek} new pages`}
            delta={data.stats.wow?.docsCreated}
          />
          <PulseItem
            label="Contributors"
            value={data.stats.uniqueContributors}
            sub={data.stats.agentCount > 0 ? `${data.stats.agentCount} AI agents` : undefined}
          />
          <PulseItem
            label="Calls This Week"
            value={data.callStats?.thisWeek ?? data.stats.totalCalls}
            sub={data.callStats?.avgScore ? `Avg score: ${data.callStats.avgScore}` : undefined}
            delta={data.stats.wow?.calls}
          />
        </div>

        {/* ═══════════════════════════════════════════════════
            SMART CTA — contextual insights prompt
        ═══════════════════════════════════════════════════ */}
        <div className="mb-8 rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] px-5 py-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-[#c9a84c] dark:text-[#d4af37] shrink-0" />
            <div className="flex-1 min-w-0">
              {insights ? (
                <p className="text-[12px] text-black/50 dark:text-white/50 leading-relaxed">
                  Last analysis <span className="font-medium text-black/70 dark:text-white/70">{daysSinceInsight === 0 ? "today" : daysSinceInsight === 1 ? "yesterday" : `${daysSinceInsight} days ago`}</span>.
                  {" "}Your team has {data.stats.docsEditedThisWeek} page edits, {data.stats.totalCalls} calls, and {github.totalCommits ?? 0} commits since then.
                </p>
              ) : (
                <p className="text-[12px] text-black/50 dark:text-white/50 leading-relaxed">
                  No AI analysis yet. Generate insights to see signal/noise scores, vision tracking, and personalized recommendations for your CEO, CTO, and CRO agents.
                </p>
              )}
            </div>
            <button
              onClick={generateInsights}
              disabled={generatingInsights}
              className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-4 py-2 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-50 shrink-0"
            >
              {generatingInsights ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
              ) : (
                <><Brain className="h-3 w-3" /> {insights ? "Refresh Analysis" : "Generate Insights"}</>
              )}
            </button>
          </div>

          {/* Recommendations inline */}
          {insights?.recommendations && insights.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <ul className="space-y-1">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-black/50 dark:text-white/45 leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#c9a84c]/40 dark:bg-[#d4af37]/40 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            CEO SECTION — "Are we executing on what matters?"
        ═══════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {ceoAgent ? (
              <AgentBadge
                agent={ceoAgent}
                monitor={findMonitor(ceoAgent.id)?.monitor}
                onToggle={() => toggleAgentMonitor(ceoAgent.id, !findMonitor(ceoAgent.id)?.monitor?.enabled)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-black/40 dark:text-white/40" />
                <span className="text-sm font-semibold text-black dark:text-white">Strategic Overview</span>
              </div>
            )}
          </div>

          {sn && vt ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Signal vs Noise */}
              <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
                <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                  <div className="flex items-center gap-2">
                    <Signal className="h-4 w-4 text-black/40 dark:text-white/40" />
                    <CardTitle className="text-sm font-semibold text-black dark:text-white">Signal vs Noise</CardTitle>
                  </div>
                  <CardDescription className="text-[11px] text-black/40 dark:text-white/40">{sn.overall.summary}</CardDescription>
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
                        <div className="h-full rounded-l-full bg-[#c9a84c] dark:bg-[#d4af37] transition-all" style={{ width: `${sn.overall.signal}%` }} />
                        <div className="h-full rounded-r-full bg-black/10 dark:bg-white/10 transition-all" style={{ width: `${sn.overall.noise}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <ChartContainer config={signalNoiseChartConfig} className="h-[140px] w-full">
                    <BarChart data={sn.categories} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} width={90} className="text-[10px] fill-black/40 dark:fill-white/40" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
                      <Bar dataKey="signal" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                      <Bar dataKey="noise" fill="var(--chart-5)" radius={[0, 4, 4, 0]} barSize={12} stackId="a" />
                    </BarChart>
                  </ChartContainer>

                  {/* Per-member signal */}
                  {sn.members.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {sn.members.map((m) => (
                        <div key={m.name} className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-black/60 dark:text-white/60 w-20 truncate shrink-0">{m.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
                            <div className="h-full bg-[#c9a84c] dark:bg-[#d4af37] transition-all" style={{ width: `${m.signal}%` }} />
                            <div className="h-full bg-black/10 dark:bg-white/10 transition-all" style={{ width: `${m.noise}%` }} />
                          </div>
                          <span className="text-[9px] text-black/30 dark:text-white/30 w-8 text-right shrink-0">{m.signal}%</span>
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
                    <CardTitle className="text-sm font-semibold text-black dark:text-white">Vision Tracker</CardTitle>
                  </div>
                  <CardDescription className="text-[11px] text-black/40 dark:text-white/40">Short-term execution vs long-term strategic alignment</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center mb-4">
                    <ChartContainer config={visionChartConfig} className="h-[120px] w-[120px]">
                      <RadialBarChart
                        innerRadius="60%" outerRadius="100%"
                        data={[
                          { name: "Long-term", value: vt.longTerm.score, fill: "var(--chart-2)" },
                          { name: "Short-term", value: vt.shortTerm.score, fill: "var(--chart-1)" },
                        ]}
                        startAngle={180} endAngle={0}
                      >
                        <RadialBar background={{ fill: "rgba(0,0,0,0.03)" }} dataKey="value" cornerRadius={6} />
                      </RadialBarChart>
                    </ChartContainer>
                    <div className="ml-4">
                      <div className="text-3xl font-bold text-black dark:text-white">{vt.alignment}%</div>
                      <div className="text-[10px] text-black/40 dark:text-white/40">alignment</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[{ data: vt.shortTerm, icon: Zap, label: "Short-term" }, { data: vt.longTerm, icon: Target, label: "Long-term" }].map(({ data: d, icon: Icon, label }) => (
                      <div key={label} className="rounded-lg border border-black/6 dark:border-white/8 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className="h-3 w-3 text-black/30 dark:text-white/30" />
                          <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">{label}</span>
                          <span className="ml-auto text-sm font-bold text-black dark:text-white">{d.score}%</span>
                        </div>
                        <p className="text-[11px] text-black/50 dark:text-white/50 font-medium mb-1.5">{d.label}</p>
                        <ul className="space-y-0.5">
                          {d.items.map((item, i) => (
                            <li key={i} className="text-[10px] text-black/40 dark:text-white/40 flex items-start gap-1">
                              <span className="mt-0.5 h-1 w-1 rounded-full bg-black/30 dark:bg-white/30 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] text-black/50 dark:text-white/50 leading-relaxed italic">{vt.insight}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Empty state for CEO section */
            <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-8 text-center">
              <Signal className="h-6 w-6 text-black/10 dark:text-white/10 mx-auto mb-3" />
              <p className="text-sm text-black/30 dark:text-white/30">Signal/Noise and Vision Tracking</p>
              <p className="text-[11px] text-black/20 dark:text-white/20 mt-1">
                Click "Generate Insights" above to analyze team productivity and strategic alignment
              </p>
            </div>
          )}

          {/* Team KPI Scorecards — belongs under CEO as overall attainment */}
          {data.memberActivity.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                <span className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Team Scorecards</span>
                <span className="text-[10px] text-black/25 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">{kpiData?.week || "This Week"}</span>
                <button onClick={() => setShowAddKpi(!showAddKpi)} className="ml-auto flex items-center gap-1 text-[10px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                  <Plus className="h-3 w-3" /> Add KPI
                </button>
              </div>

              {/* Add KPI form */}
              {showAddKpi && (
                <div className="mb-3 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                    <div>
                      <label className="text-[9px] text-black/40 dark:text-white/40 uppercase tracking-wider mb-0.5 block">Member</label>
                      <select value={kpiUserId} onChange={(e) => setKpiUserId(e.target.value)}
                        className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-[11px] text-black dark:text-white outline-none">
                        <option value="">Select...</option>
                        {data.memberActivity.map((m) => (<option key={m.userId} value={m.userId}>{m.name}</option>))}
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
                        className="w-full rounded-md bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-40">Add</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {data.memberActivity.map((member) => {
                  const memberKpis = allKpis.filter((k) => k.userId === member.userId);
                  const snMember = sn?.members.find((m) => m.name === member.name);
                  const mTotal = memberKpis.reduce((s, k) => s + k.target, 0);
                  const mActual = memberKpis.reduce((s, k) => s + k.actual, 0);
                  const mPct = mTotal > 0 ? Math.min(100, Math.round((mActual / mTotal) * 100)) : null;
                  const memberRole = roleAssignments.find((ra) => ra.userId === member.userId);

                  return (
                    <div key={member.userId} className="rounded-xl border border-black/6 dark:border-white/8 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="h-7 w-7 rounded-full shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-black/8 dark:bg-white/8 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-black/40 dark:text-white/40">{member.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-black dark:text-white">{member.name}</p>
                            {/* Role assignment selector */}
                            <select
                              value={memberRole?.agentConfigId || ""}
                              onChange={(e) => { if (e.target.value) assignRole(member.userId, e.target.value); }}
                              className="text-[9px] rounded-full border border-black/8 dark:border-white/10 bg-transparent px-2 py-0.5 text-black/40 dark:text-white/40 outline-none cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-colors"
                            >
                              <option value="">Assign role…</option>
                              {data.agents.map((a) => (
                                <option key={a.id} value={a.id}>{a.title}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[10px] text-black/30 dark:text-white/30">{member.docs} pages · {member.edits} edits</p>
                        </div>
                        {snMember && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-12 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                              <div className="h-full bg-[#c9a84c] dark:bg-[#d4af37] rounded-full transition-all" style={{ width: `${snMember.signal}%` }} />
                            </div>
                            <span className="text-[9px] text-black/30 dark:text-white/30">{snMember.signal}%</span>
                          </div>
                        )}
                        {mPct !== null && (
                          <span className={`text-sm font-bold shrink-0 ${mPct >= 80 ? "text-[#c9a84c] dark:text-[#d4af37]" : mPct >= 50 ? "text-black/40 dark:text-white/40" : "text-black/20 dark:text-white/20"}`}>
                            {mPct}%
                          </span>
                        )}
                      </div>

                      {memberKpis.length > 0 ? (
                        <div className="space-y-2">
                          {memberKpis.map((kpi) => {
                            const pct = kpi.target > 0 ? Math.min(100, Math.round((kpi.actual / kpi.target) * 100)) : 0;
                            return (
                              <div key={kpi.id} className="flex items-center gap-3">
                                <span className="text-[11px] text-black/50 dark:text-white/50 w-28 truncate shrink-0">{kpi.name}</span>
                                <div className="flex-1 h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-[#c9a84c] dark:bg-[#d4af37]" : pct >= 50 ? "bg-black/20 dark:bg-white/25" : "bg-black/10 dark:bg-white/10"}`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <input type="number" value={kpi.actual} onChange={(e) => updateKpiActual(kpi.id, parseFloat(e.target.value) || 0)}
                                    className="w-12 rounded border border-black/10 dark:border-white/10 bg-transparent px-1.5 py-0.5 text-[10px] text-black dark:text-white text-center outline-none focus:border-black/30 dark:focus:border-white/30" />
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
                        <p className="text-[10px] text-black/20 dark:text-white/20 italic">No KPIs — click "Add KPI" above</p>
                      )}
                      {snMember?.insight && (
                        <p className="mt-2 text-[10px] text-black/35 dark:text-white/35 italic leading-relaxed">{snMember.insight}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CEO Agent Digest */}
          {findDigest("ceo") && <AgentDigestCard digest={findDigest("ceo")!} />}
        </section>

        {/* ═══════════════════════════════════════════════════
            CTO SECTION — "Is the team shipping?"
        ═══════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {ctoAgent ? (
              <AgentBadge
                agent={ctoAgent}
                monitor={findMonitor(ctoAgent.id)?.monitor}
                onToggle={() => toggleAgentMonitor(ctoAgent.id, !findMonitor(ctoAgent.id)?.monitor?.enabled)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-black/40 dark:text-white/40" />
                <span className="text-sm font-semibold text-black dark:text-white">Development</span>
              </div>
            )}
          </div>

          {/* Workspace Activity Chart */}
          <Card className="pt-0 mb-4 border-black/6 dark:border-white/8 bg-transparent shadow-none">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b border-black/6 dark:border-white/8 py-4 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle className="text-sm font-semibold text-black dark:text-white">Workspace Activity</CardTitle>
                <CardDescription className="text-[11px] text-black/40 dark:text-white/40">
                  Edits, pages created, and AI breakouts
                </CardDescription>
              </div>
              <Select value={timeRange} onValueChange={(v) => { if (v) setTimeRange(v); }}>
                <SelectTrigger className="w-[130px] rounded-lg text-xs ml-auto border-black/8 dark:border-white/10" aria-label="Select time range">
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
              <ChartContainer config={activityChartConfig} className="aspect-auto h-[200px] w-full">
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
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                    className="text-[10px] fill-black/30 dark:fill-white/30"
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} indicator="dot" />} />
                  <Area dataKey="edits" type="natural" fill="url(#fillEdits)" stroke="var(--color-edits)" strokeWidth={2} stackId="a" />
                  <Area dataKey="created" type="natural" fill="url(#fillCreated)" stroke="var(--color-created)" strokeWidth={2} stackId="a" />
                  <Area dataKey="breakouts" type="natural" fill="url(#fillBreakouts)" stroke="var(--color-breakouts)" strokeWidth={2} stackId="a" />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* GitHub — full-width calendar + commits */}
          {github.configured ? (
            <Card className="pt-0 mb-4 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <GitCommit className="h-4 w-4 text-[#c9a84c] dark:text-[#d4af37]" />
                  <CardTitle className="text-sm font-semibold text-black dark:text-white">GitHub</CardTitle>

                  {github.repos && github.repos.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => switchRepo("all")}
                        className={`text-[10px] rounded-full px-2.5 py-0.5 font-medium transition-colors ${activeRepo === "all" ? "bg-[#c9a84c]/10 dark:bg-[#d4af37]/10 text-[#c9a84c] dark:text-[#d4af37]" : "text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"}`}>
                        All Projects
                      </button>
                      {github.repos.map((r) => (
                        <button key={r.id} onClick={() => switchRepo(r.name)}
                          className={`text-[10px] rounded-full px-2.5 py-0.5 font-medium transition-colors ${activeRepo === r.name ? "bg-[#c9a84c]/10 dark:bg-[#d4af37]/10 text-[#c9a84c] dark:text-[#d4af37]" : "text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"}`}>
                          {r.name.split("/")[1] || r.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <span className="text-[10px] text-black/25 dark:text-white/25">{github.totalCommits} commits</span>
                    <button onClick={() => setShowGitHubConfig(true)} className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors">
                      <Plus className="h-3 w-3" /> Add Repo
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {github.timeline && github.timeline.length > 0 && (
                  <div className="mb-5"><ContributionCalendar timeline={github.timeline} /></div>
                )}

                <div className="flex items-start gap-6 mb-4 flex-wrap">
                  {github.authors && github.authors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {github.authors.map((a) => (
                        <div key={a.name} className="flex items-center gap-1.5 rounded-full border border-black/6 dark:border-white/8 pl-1 pr-2.5 py-0.5">
                          {a.avatar ? <img src={a.avatar} alt="" className="h-4 w-4 rounded-full" /> : (
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

                  {github.repos && github.repos.length > 1 && activeRepo === "all" && (
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                      {github.repos.map((r) => (
                        <div key={r.id} className="flex items-center gap-1 rounded-full border border-black/6 dark:border-white/8 pl-2.5 pr-1 py-0.5">
                          <span className="text-[9px] text-black/35 dark:text-white/35">{r.name}</span>
                          <button onClick={() => removeGitHubRepo(r.id)} className="text-black/15 dark:text-white/15 hover:text-red-500 transition-colors p-0.5" title={`Remove ${r.name}`}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-0.5">
                  {github.commits?.slice(0, githubExpanded ? 50 : 10).map((c) => (
                    <a key={c.sha + c.repo} href={c.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2 px-1 py-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group">
                      <code className="text-[10px] text-[#c9a84c] dark:text-[#d4af37] font-mono mt-0.5 shrink-0">{c.sha}</code>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-black/60 dark:text-white/60 truncate group-hover:text-black dark:group-hover:text-white transition-colors">{c.message}</p>
                        <p className="text-[9px] text-black/25 dark:text-white/25">{c.author} · {c.repo.split("/")[1]} · {new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                      </div>
                    </a>
                  ))}
                </div>
                {github.commits && github.commits.length > 10 && (
                  <button onClick={() => setGithubExpanded(!githubExpanded)} className="mt-2 text-[10px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                    {githubExpanded ? "Show less" : `Show all ${github.commits.length} commits`}
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            /* GitHub connect */
            <div className="mb-4">
              {showGitHubConfig ? (
                <GitHubConfigCard
                  ghOwner={ghOwner} setGhOwner={setGhOwner}
                  ghRepo={ghRepo} setGhRepo={setGhRepo}
                  ghToken={ghToken} setGhToken={setGhToken}
                  ghSaving={ghSaving} ghError={ghError}
                  onSave={saveGitHubConfig}
                  onCancel={() => { setShowGitHubConfig(false); setGhError(""); }}
                />
              ) : (
                <button onClick={() => setShowGitHubConfig(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 hover:border-[#c9a84c]/30 dark:hover:border-[#d4af37]/30 transition-colors group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 shrink-0">
                    <GitCommit className="h-4 w-4 text-[#c9a84c] dark:text-[#d4af37]" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">Connect GitHub Repository</p>
                    <p className="text-[10px] text-black/30 dark:text-white/30">Track commits and analyze development workflow</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-black/15 dark:text-white/15 ml-auto group-hover:text-[#c9a84c] dark:group-hover:text-[#d4af37] transition-colors" />
                </button>
              )}
            </div>
          )}

          {/* GitHub config overlay when already configured */}
          {github.configured && showGitHubConfig && (
            <div className="mb-4">
              <GitHubConfigCard
                title="Add Another Repository"
                ghOwner={ghOwner} setGhOwner={setGhOwner}
                ghRepo={ghRepo} setGhRepo={setGhRepo}
                ghToken={ghToken} setGhToken={setGhToken}
                ghSaving={ghSaving} ghError={ghError}
                onSave={saveGitHubConfig}
                onCancel={() => { setShowGitHubConfig(false); setGhError(""); }}
              />
            </div>
          )}

          {/* Workflow Log (CTO-focused — filtered to code/docs) */}
          {insights?.workflowLog && insights.workflowLog.length > 0 && (
            <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-black/40 dark:text-white/40" />
                  <CardTitle className="text-sm font-semibold text-black dark:text-white">Workflow Log</CardTitle>
                </div>
                <CardDescription className="text-[11px] text-black/40 dark:text-white/40">AI-tracked activity timeline</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 max-h-[320px] overflow-y-auto">
                <div className="space-y-0.5">
                  {insights.workflowLog.filter((e) => ["commit", "doc", "breakout"].includes(e.type)).map((entry, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-1 py-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <div className="mt-0.5 text-black/25 dark:text-white/25">{workflowIcon(entry.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-black/60 dark:text-white/60 leading-snug">
                          <span className="font-medium text-black/80 dark:text-white/80">{entry.author}</span> {entry.summary}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${impactColor(entry.impact)}`}>{entry.impact}</span>
                        <span className="text-[9px] text-black/20 dark:text-white/20">{entry.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTO Agent Digest */}
          {findDigest("cto") && <AgentDigestCard digest={findDigest("cto")!} />}
        </section>

        {/* ═══════════════════════════════════════════════════
            CRO SECTION — "Are we closing?"
        ═══════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {croAgent ? (
              <AgentBadge
                agent={croAgent}
                monitor={findMonitor(croAgent.id)?.monitor}
                onToggle={() => toggleAgentMonitor(croAgent.id, !findMonitor(croAgent.id)?.monitor?.enabled)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-black/40 dark:text-white/40" />
                <span className="text-sm font-semibold text-black dark:text-white">Revenue & Pipeline</span>
              </div>
            )}
          </div>

          {/* Call stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium mb-1">Total Calls</p>
              <p className="text-2xl font-bold text-black dark:text-white">{data.callStats?.total ?? 0}</p>
              <p className="text-[10px] text-black/30 dark:text-white/30">last 30 days</p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-[#c9a84c] dark:text-[#d4af37]">
                {data.callStats?.total ? Math.round((data.callStats.positive / data.callStats.total) * 100) : 0}%
              </p>
              <p className="text-[10px] text-black/30 dark:text-white/30">{data.callStats?.positive ?? 0} positive</p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium mb-1">Avg Score</p>
              <p className="text-2xl font-bold text-black dark:text-white">{data.callStats?.avgScore ?? 0}</p>
              <p className="text-[10px] text-black/30 dark:text-white/30">out of 100</p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium mb-1">Outcomes</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-3 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex">
                  {data.callStats?.total ? (
                    <>
                      <div className="h-full bg-[#c9a84c] dark:bg-[#d4af37]" style={{ width: `${(data.callStats.positive / data.callStats.total) * 100}%` }} />
                      <div className="h-full bg-black/15 dark:bg-white/15" style={{ width: `${(data.callStats.neutral / data.callStats.total) * 100}%` }} />
                      <div className="h-full bg-black/5 dark:bg-white/5" style={{ width: `${(data.callStats.negative / data.callStats.total) * 100}%` }} />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[8px] text-black/30 dark:text-white/30">{data.callStats?.positive ?? 0} won</span>
                <span className="text-[8px] text-black/20 dark:text-white/20">{data.callStats?.neutral ?? 0} neutral</span>
                <span className="text-[8px] text-black/15 dark:text-white/15">{data.callStats?.negative ?? 0} lost</span>
              </div>
            </div>
          </div>

          {/* Call outcome trend chart */}
          {data.dailyCalls && data.dailyCalls.some((d) => d.positive + d.neutral + d.negative > 0) && (
            <Card className="pt-0 mb-4 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <CardTitle className="text-sm font-semibold text-black dark:text-white">Call Outcomes Over Time</CardTitle>
                <CardDescription className="text-[11px] text-black/40 dark:text-white/40">Daily call results — positive, neutral, negative</CardDescription>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={callChartConfig} className="aspect-auto h-[180px] w-full">
                  <BarChart data={callChartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-black/[0.06] dark:stroke-white/[0.06]" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                      className="text-[10px] fill-black/30 dark:fill-white/30"
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} cursor={false} />
                    <Bar dataKey="positive" fill="var(--chart-1)" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="neutral" fill="var(--chart-2)" radius={[0, 0, 0, 0]} stackId="a" />
                    <Bar dataKey="negative" fill="var(--chart-5)" radius={[0, 0, 4, 4]} stackId="a" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* CRO workflow log — calls only */}
          {insights?.workflowLog && insights.workflowLog.filter((e) => e.type === "call").length > 0 && (
            <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
              <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
                <CardTitle className="text-sm font-semibold text-black dark:text-white">Call Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 max-h-[240px] overflow-y-auto">
                <div className="space-y-0.5">
                  {insights.workflowLog.filter((e) => e.type === "call").map((entry, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-1 py-1.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <div className="mt-0.5 text-black/25 dark:text-white/25"><Phone className="h-3 w-3" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-black/60 dark:text-white/60 leading-snug">
                          <span className="font-medium text-black/80 dark:text-white/80">{entry.author}</span> {entry.summary}
                        </p>
                      </div>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${impactColor(entry.impact)}`}>{entry.impact}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CRO Agent Digest */}
          {findDigest("cro") && <AgentDigestCard digest={findDigest("cro")!} />}
        </section>

        {/* ═══════════════════════════════════════════════════
            ACTIVITY FEED + SIDEBAR
        ═══════════════════════════════════════════════════ */}
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
                <p className="text-[11px] text-black/20 dark:text-white/20 mt-1">
                  Create documents, log calls, or generate breakouts to see activity here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.activity.map((item, i) => {
                  const docId = item.meta?.docId;
                  const isClickable = !!docId;
                  return (
                    <div
                      key={i}
                      onClick={isClickable ? () => router.push(`/${workspaceId}/${docId}`) : undefined}
                      className={`group flex items-start gap-3 rounded-xl px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-black/[0.03] dark:bg-white/[0.03] border-black/6 dark:border-white/8">
                        <ActivityIcon type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] text-black/70 dark:text-white/70 leading-snug ${isClickable ? "group-hover:text-black dark:group-hover:text-white transition-colors" : ""}`}>
                          {item.userName && <span className="font-medium text-black dark:text-white">{item.userName} </span>}
                          {item.title}
                        </p>
                        {item.subtitle && <p className="text-[11px] text-black/35 dark:text-white/35 mt-0.5">{item.subtitle}</p>}
                      </div>
                      <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
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

            {data.memberActivity.length > 1 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
                  <h3 className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Team</h3>
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
                        <p className="text-[10px] text-black/30 dark:text-white/30">{member.edits} edits this week</p>
                      </div>
                      {/* Mini KPI bar */}
                      {(() => {
                        const mKpis = allKpis.filter((k) => k.userId === member.userId);
                        const mT = mKpis.reduce((s, k) => s + k.target, 0);
                        const mA = mKpis.reduce((s, k) => s + k.actual, 0);
                        const pct = mT > 0 ? Math.min(100, Math.round((mA / mT) * 100)) : null;
                        if (pct === null) return null;
                        return (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-10 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 80 ? "bg-[#c9a84c] dark:bg-[#d4af37]" : "bg-black/15 dark:bg-white/15"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[8px] text-black/25 dark:text-white/25">{pct}%</span>
                          </div>
                        );
                      })()}
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

/* ──────────────────── Sub-components ──────────────────── */

function PulseItem({ label, value, sub, accent, delta }: {
  label: string; value: number | string; sub?: string; accent?: boolean; delta?: number;
}) {
  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-2xl font-bold tracking-tight ${accent ? "text-[#c9a84c] dark:text-[#d4af37]" : "text-black dark:text-white"}`}>{value}</p>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-[10px] font-medium ${delta > 0 ? "text-[#c9a84c] dark:text-[#d4af37]" : "text-black/30 dark:text-white/30"}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      {sub && <p className="text-[10px] text-black/30 dark:text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function GitHubConfigCard({ title, ghOwner, setGhOwner, ghRepo, setGhRepo, ghToken, setGhToken, ghSaving, ghError, onSave, onCancel }: {
  title?: string;
  ghOwner: string; setGhOwner: (v: string) => void;
  ghRepo: string; setGhRepo: (v: string) => void;
  ghToken: string; setGhToken: (v: string) => void;
  ghSaving: boolean; ghError: string;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <Card className="pt-0 border-black/6 dark:border-white/8 bg-transparent shadow-none">
      <CardHeader className="border-b border-black/6 dark:border-white/8 py-4">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-[#c9a84c] dark:text-[#d4af37]" />
          <CardTitle className="text-sm font-semibold text-black dark:text-white">{title || "Connect GitHub Repository"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">Owner</label>
            <input value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} placeholder="e.g. automatq"
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30" />
          </div>
          <div>
            <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">Repository</label>
            <input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="e.g. markedup"
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30" />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-wider font-medium mb-1 block">
            Personal Access Token <span className="normal-case">(optional, for private repos)</span>
          </label>
          <input value={ghToken} onChange={(e) => setGhToken(e.target.value)} type="password" placeholder="ghp_... or github_pat_..."
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/30 dark:focus:border-white/30" />
        </div>
        {ghError && <p className="text-[11px] text-red-500 mb-2">{ghError}</p>}
        <div className="flex gap-2">
          <button onClick={onSave} disabled={ghSaving || !ghOwner || !ghRepo}
            className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-4 py-1.5 text-[11px] font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-50">
            {ghSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCommit className="h-3 w-3" />} Connect
          </button>
          <button onClick={onCancel}
            className="rounded-lg border border-black/8 dark:border-white/10 px-4 py-1.5 text-[11px] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDigestCard({ digest }: { digest: AgentDigest }) {
  const [expanded, setExpanded] = useState(false);
  const p = digest.payload;
  const alertIcon = (level: string) => {
    switch (level) {
      case "critical": return <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />;
      case "warning": return <AlertTriangle className="h-3 w-3 text-[#c9a84c] dark:text-[#d4af37] shrink-0" />;
      default: return <Info className="h-3 w-3 text-black/30 dark:text-white/30 shrink-0" />;
    }
  };
  const alertBg = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/5 border-red-500/10";
      case "warning": return "bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 border-[#c9a84c]/10 dark:border-[#d4af37]/10";
      default: return "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5";
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-black/6 dark:border-white/8 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <Brain className="h-3.5 w-3.5 text-[#c9a84c] dark:text-[#d4af37] shrink-0" />
        <span className="text-[11px] font-medium text-black/60 dark:text-white/60 flex-1 text-left truncate">
          Latest Agent Report
        </span>
        {p.metrics?.activityScore !== undefined && (
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs font-bold ${p.metrics.activityScore >= 70 ? "text-[#c9a84c] dark:text-[#d4af37]" : p.metrics.activityScore >= 40 ? "text-black/50 dark:text-white/50" : "text-black/25 dark:text-white/25"}`}>
              {p.metrics.activityScore}
            </span>
            {p.metrics.trendDirection === "up" && <TrendingUp className="h-3 w-3 text-[#c9a84c] dark:text-[#d4af37]" />}
            {p.metrics.trendDirection === "down" && <TrendingDown className="h-3 w-3 text-black/30 dark:text-white/30" />}
          </div>
        )}
        {p.alerts && p.alerts.some((a) => a.level === "critical" || a.level === "warning") && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#c9a84c]/10 dark:bg-[#d4af37]/10 shrink-0">
            <AlertTriangle className="h-2.5 w-2.5 text-[#c9a84c] dark:text-[#d4af37]" />
          </span>
        )}
        <span className="text-[9px] text-black/20 dark:text-white/20 shrink-0">{timeAgo(digest.createdAt)}</span>
        {expanded ? <ChevronUp className="h-3 w-3 text-black/20 dark:text-white/20 shrink-0" /> : <ChevronDown className="h-3 w-3 text-black/20 dark:text-white/20 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 dark:border-white/5 pt-3">
          {/* Summary */}
          {p.summary && (
            <p className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">{p.summary}</p>
          )}

          {/* Key insight */}
          {p.metrics?.keyInsight && (
            <div className="flex items-start gap-2 rounded-lg bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 px-3 py-2">
              <Zap className="h-3 w-3 text-[#c9a84c] dark:text-[#d4af37] mt-0.5 shrink-0" />
              <p className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">{p.metrics.keyInsight}</p>
            </div>
          )}

          {/* Alerts */}
          {p.alerts && p.alerts.length > 0 && (
            <div className="space-y-1.5">
              {p.alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${alertBg(alert.level)}`}>
                  {alertIcon(alert.level)}
                  <p className="text-[11px] text-black/60 dark:text-white/60 leading-relaxed">{alert.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {p.recommendations && p.recommendations.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {p.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-black/50 dark:text-white/45 leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#c9a84c]/40 dark:bg-[#d4af37]/40 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
