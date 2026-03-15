"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Loader2,
  Lightbulb,
  Minus,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Target,
  BarChart3,
  RefreshCw,
  Gem,
  Repeat,
  GitBranch,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
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

interface DigestMetrics {
  docsCreated?: number;
  docsEdited?: number;
  breakouts?: number;
  callsLogged?: number;
  callWinRate?: number;
  avgCallScore?: number;
  kpiAttainment?: number | null;
  momentum?: "accelerating" | "steady" | "decelerating" | "stalled";
  activityScore?: number;
}

interface GoldenGem {
  gem: string;
  context: string;
  category: string;
}

interface PlaybookPattern {
  pattern: string;
  evidence: string;
  actionable: string;
}

interface Decision {
  decision: string;
  date: string;
  impact: string;
}

interface DigestPayload {
  headline?: string;
  trajectory?: string;
  summary?: string;
  metrics?: Record<string, unknown>;
  highlights?: { type: string; text: string; date?: string }[];
  recommendations?: string[];
  goldenGems?: GoldenGem[];
  playbookPatterns?: PlaybookPattern[];
  decisions?: Decision[];
}

interface Digest {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  metrics: DigestMetrics;
  highlights: { type: string; text: string; date?: string }[];
  payload: DigestPayload;
  createdAt: string;
}

/* ──────────────────── Chart Config ──────────────────── */

const momentumChartConfig = {
  activityScore: { label: "Activity", color: "#c9a84c" },
  callWinRate: { label: "Win Rate", color: "#22c55e" },
} satisfies ChartConfig;

/* ──────────────────── Page ──────────────────── */

export default function OperationsChronicle() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";

  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchDigests = useCallback(
    async (cursor?: string) => {
      if (!workspaceId) return;
      const isMore = !!cursor;
      if (isMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const periodParam = period !== "all" ? `&period=${period}` : "";
        const url = `/api/operations?workspaceId=${workspaceId}${periodParam}&limit=20${cursor ? `&cursor=${cursor}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMore) {
            setDigests((prev) => [...prev, ...data.digests]);
          } else {
            setDigests(data.digests);
          }
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        console.error("Failed to fetch digests:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [workspaceId, period]
  );

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  // Momentum chart data — reverse to show oldest→newest
  const chartData = useMemo(() => {
    return [...digests]
      .reverse()
      .map((d) => ({
        date: new Date(d.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        activityScore: d.metrics.activityScore ?? 0,
        callWinRate: d.metrics.callWinRate ?? 0,
      }));
  }, [digests]);

  // Collect all golden gems across digests
  const allGems = useMemo(() => {
    const gems: (GoldenGem & { date: string })[] = [];
    for (const d of digests) {
      if (d.payload.goldenGems) {
        for (const g of d.payload.goldenGems) {
          gems.push({ ...g, date: d.periodStart });
        }
      }
    }
    return gems;
  }, [digests]);

  // Collect all playbook patterns
  const allPatterns = useMemo(() => {
    const patterns: PlaybookPattern[] = [];
    const seen = new Set<string>();
    for (const d of digests) {
      if (d.payload.playbookPatterns) {
        for (const p of d.payload.playbookPatterns) {
          if (!seen.has(p.pattern)) {
            seen.add(p.pattern);
            patterns.push(p);
          }
        }
      }
    }
    return patterns;
  }, [digests]);

  const handleGenerate = async (genPeriod: string) => {
    if (!workspaceId || generating) return;
    setGenerating(genPeriod);
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, period: genPeriod === "all" ? "daily" : genPeriod }),
      });
      if (res.ok) {
        await fetchDigests();
      }
    } catch (err) {
      console.error("Failed to generate digest:", err);
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async () => {
    if (!workspaceId || exporting || digests.length === 0) return;
    setExporting(true);
    try {
      const md = generateMarkdownExport(digests, allGems, allPatterns);
      // Create a new document with the markdown content
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: `Operations Chronicle — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: md }],
              },
            ],
          },
        }),
      });
      if (res.ok) {
        const doc = await res.json();
        router.push(`/${workspaceId}/${doc.id}`);
      }
    } catch (err) {
      console.error("Failed to export:", err);
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ──────────────────── Render ──────────────────── */

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b border-black/[0.06] dark:border-white/[0.06] px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c9a84c]/10 dark:bg-[#d4af37]/10">
              <BookOpen className="h-5 w-5 text-[#c9a84c] dark:text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-black/90 dark:text-white/90">
                Operations Chronicle
              </h1>
              <p className="text-xs text-black/40 dark:text-white/40">
                Your business story, from day one to infinity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => handleGenerate(period)}
              disabled={!!generating}
              className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Generate
            </button>

            {digests.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] px-3 py-1.5 text-xs font-medium text-black/60 dark:text-white/60 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-black/30 dark:text-white/30" />
            <p className="text-xs text-black/40 dark:text-white/40">Loading chronicle…</p>
          </div>
        ) : digests.length === 0 ? (
          <EmptyState onGenerate={() => handleGenerate(period)} generating={!!generating} period={period} />
        ) : (
          <div className="space-y-6">
            {/* Momentum Chart */}
            {chartData.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#c9a84c] dark:text-[#d4af37]" />
                    Momentum
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={momentumChartConfig} className="h-[180px] w-full">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="activityScore" stroke="#c9a84c" fill="#c9a84c" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="callWinRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1.5} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Golden Gems Panel */}
            {allGems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gem className="h-4 w-4 text-[#c9a84c] dark:text-[#d4af37]" />
                    Golden Gems
                    <span className="text-[10px] font-normal text-black/40 dark:text-white/40">
                      Reusable lessons from your journey
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allGems.slice(0, 10).map((g, i) => (
                      <div key={i} className="rounded-lg bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 border border-[#c9a84c]/10 dark:border-[#d4af37]/10 p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-3.5 w-3.5 text-[#c9a84c] dark:text-[#d4af37] mt-0.5 flex-none" />
                          <div>
                            <p className="text-xs font-medium text-black/80 dark:text-white/80">{g.gem}</p>
                            <p className="text-[11px] text-black/50 dark:text-white/50 mt-1">{g.context}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex rounded bg-black/[0.05] dark:bg-white/[0.05] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40">
                                {g.category}
                              </span>
                              <span className="text-[10px] text-black/30 dark:text-white/30">
                                {new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Playbook Patterns */}
            {allPatterns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-blue-500" />
                    Playbook Patterns
                    <span className="text-[10px] font-normal text-black/40 dark:text-white/40">
                      Recurring strategies that work
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allPatterns.slice(0, 6).map((p, i) => (
                      <div key={i} className="rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-3">
                        <p className="text-xs font-medium text-black/80 dark:text-white/80">{p.pattern}</p>
                        <p className="text-[11px] text-black/50 dark:text-white/50 mt-1">{p.evidence}</p>
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <span className="text-[#c9a84c] dark:text-[#d4af37] text-[11px] flex-none">→</span>
                          <span className="text-[11px] text-black/60 dark:text-white/60">{p.actionable}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-black/[0.08] dark:bg-white/[0.08]" />

              <div className="space-y-6">
                {digests.map((digest, i) => (
                  <DigestEntry
                    key={digest.id}
                    digest={digest}
                    expanded={expandedIds.has(digest.id)}
                    onToggle={() => toggleExpand(digest.id)}
                    isFirst={i === 0}
                  />
                ))}
              </div>

              {nextCursor && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => fetchDigests(nextCursor)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] px-4 py-2 text-xs text-black/60 dark:text-white/60 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    Load earlier entries
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────── Empty State ──────────────────── */

function EmptyState({
  onGenerate,
  generating,
  period,
}: {
  onGenerate: () => void;
  generating: boolean;
  period: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c9a84c]/10 dark:bg-[#d4af37]/10">
        <BookOpen className="h-8 w-8 text-[#c9a84c] dark:text-[#d4af37]" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-black/80 dark:text-white/80">
          No chronicle entries yet
        </h2>
        <p className="mt-1 text-sm text-black/40 dark:text-white/40 max-w-md">
          Generate your first digest to start documenting your business journey.
          The AI will analyze all workspace activity and create a narrative summary with golden gems and playbook patterns.
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Generate First Digest
      </button>
    </div>
  );
}

/* ──────────────────── Digest Entry ──────────────────── */

function DigestEntry({
  digest,
  expanded,
  onToggle,
  isFirst,
}: {
  digest: Digest;
  expanded: boolean;
  onToggle: () => void;
  isFirst: boolean;
}) {
  const start = new Date(digest.periodStart);
  const m = digest.metrics;
  const p = digest.payload;
  const dateLabel =
    digest.period === "daily"
      ? start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      : digest.period === "weekly"
        ? `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : start.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const momentumEl = (() => {
    switch (m.momentum) {
      case "accelerating":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "decelerating":
        return <TrendingDown className="h-4 w-4 text-amber-500" />;
      case "stalled":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-black/40 dark:text-white/40" />;
    }
  })();

  const highlightIcon = (type: string) => {
    switch (type) {
      case "milestone":
        return <Star className="h-3.5 w-3.5 text-[#c9a84c] dark:text-[#d4af37]" />;
      case "win":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "risk":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "decision":
        return <Target className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />;
    }
  };

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={`absolute left-[15px] top-5 h-[10px] w-[10px] rounded-full border-2 ${
          isFirst
            ? "border-[#c9a84c] dark:border-[#d4af37] bg-[#c9a84c] dark:bg-[#d4af37]"
            : "border-black/20 dark:border-white/20 bg-white dark:bg-black"
        }`}
      />

      <Card className="transition-all">
        <CardHeader className="cursor-pointer" onClick={onToggle}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-md bg-black/[0.05] dark:bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-black/50 dark:text-white/50">
                  {digest.period}
                </span>
                <span className="text-xs text-black/40 dark:text-white/40">
                  {dateLabel}
                </span>
                {m.activityScore != null && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    m.activityScore >= 70 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    m.activityScore >= 40 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {m.activityScore}/100
                  </span>
                )}
              </div>
              <CardTitle className="text-sm leading-snug">
                {p.headline || "Operations Digest"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-none">
              {momentumEl}
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-black/30 dark:text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-black/30 dark:text-white/30" />
              )}
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex flex-wrap gap-3 mt-2">
            {m.docsCreated != null && (
              <MetricBadge icon={<FileText className="h-3 w-3" />} label="Docs" value={m.docsCreated} />
            )}
            {m.callsLogged != null && (
              <MetricBadge icon={<BarChart3 className="h-3 w-3" />} label="Calls" value={m.callsLogged} />
            )}
            {m.breakouts != null && (
              <MetricBadge icon={<Sparkles className="h-3 w-3" />} label="Breakouts" value={m.breakouts} />
            )}
            {m.callWinRate != null && (
              <MetricBadge icon={<Target className="h-3 w-3" />} label="Win Rate" value={`${m.callWinRate}%`} />
            )}
            {m.kpiAttainment != null && (
              <MetricBadge icon={<TrendingUp className="h-3 w-3" />} label="KPI" value={`${m.kpiAttainment}%`} />
            )}
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Narrative */}
            <div className="text-sm text-black/70 dark:text-white/70 leading-relaxed whitespace-pre-line">
              {digest.summary || p.summary || "No summary available."}
            </div>

            {/* Trajectory */}
            {p.trajectory && (
              <div className="rounded-lg bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 border border-[#c9a84c]/10 dark:border-[#d4af37]/10 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-[#c9a84c] dark:text-[#d4af37]" />
                  <span className="text-xs font-medium text-[#c9a84c] dark:text-[#d4af37]">Trajectory</span>
                </div>
                <p className="text-xs text-black/60 dark:text-white/60">{p.trajectory}</p>
              </div>
            )}

            {/* Golden Gems for this digest */}
            {p.goldenGems && p.goldenGems.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gem className="h-3 w-3 text-[#c9a84c] dark:text-[#d4af37]" />
                  Golden Gems
                </h4>
                <div className="space-y-2">
                  {p.goldenGems.map((g, i) => (
                    <div key={i} className="rounded-lg bg-[#c9a84c]/5 dark:bg-[#d4af37]/5 p-2.5">
                      <p className="text-xs font-medium text-black/80 dark:text-white/80">{g.gem}</p>
                      <p className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">{g.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            {p.decisions && p.decisions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3 text-blue-500" />
                  Key Decisions
                </h4>
                <div className="space-y-1.5">
                  {p.decisions.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-none ${
                        d.impact === "high" ? "bg-red-500" : d.impact === "medium" ? "bg-amber-500" : "bg-black/20 dark:bg-white/20"
                      }`} />
                      <span className="text-xs text-black/60 dark:text-white/60">{d.decision}</span>
                      <span className="text-[10px] text-black/30 dark:text-white/30 flex-none ml-auto">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {digest.highlights && digest.highlights.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider mb-2">
                  Highlights
                </h4>
                <div className="space-y-1.5">
                  {digest.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-0.5 flex-none">{highlightIcon(h.type)}</div>
                      <span className="text-xs text-black/60 dark:text-white/60">{h.text}</span>
                      {h.date && (
                        <span className="text-[10px] text-black/30 dark:text-white/30 flex-none ml-auto">
                          {h.date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {p.recommendations && p.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider mb-2">
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {p.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-black/60 dark:text-white/60">
                      <span className="text-[#c9a84c] dark:text-[#d4af37] flex-none mt-px">→</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30 pt-1">
              <RefreshCw className="h-2.5 w-2.5" />
              Generated {new Date(digest.createdAt).toLocaleString()}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ──────────────────── Metric Badge ──────────────────── */

function MetricBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] px-2 py-1">
      <span className="text-black/40 dark:text-white/40">{icon}</span>
      <span className="text-[10px] text-black/40 dark:text-white/40">{label}</span>
      <span className="text-xs font-medium text-black/70 dark:text-white/70">{value}</span>
    </div>
  );
}

/* ──────────────────── Markdown Export ──────────────────── */

function generateMarkdownExport(
  digests: Digest[],
  gems: (GoldenGem & { date: string })[],
  patterns: PlaybookPattern[]
): string {
  const sorted = [...digests].reverse(); // oldest first
  let md = `# Operations Chronicle\n\n`;
  md += `> Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n`;
  md += `---\n\n`;

  // Golden Gems section
  if (gems.length > 0) {
    md += `## Golden Gems\n\n`;
    md += `*Reusable business lessons extracted from our journey*\n\n`;
    for (const g of gems) {
      md += `### ${g.gem}\n\n`;
      md += `**Context:** ${g.context}\n\n`;
      md += `**Category:** ${g.category} | **Date:** ${new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n\n`;
    }
    md += `---\n\n`;
  }

  // Playbook Patterns
  if (patterns.length > 0) {
    md += `## Playbook Patterns\n\n`;
    md += `*Recurring strategies and correlations we've identified*\n\n`;
    for (const p of patterns) {
      md += `### ${p.pattern}\n\n`;
      md += `**Evidence:** ${p.evidence}\n\n`;
      md += `**Action:** ${p.actionable}\n\n`;
    }
    md += `---\n\n`;
  }

  // Timeline entries
  md += `## Timeline\n\n`;
  for (const d of sorted) {
    const start = new Date(d.periodStart);
    const dateStr = start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const p = d.payload;

    md += `### ${p.headline || "Operations Digest"}\n\n`;
    md += `**${d.period.charAt(0).toUpperCase() + d.period.slice(1)}** — ${dateStr}`;
    if (d.metrics.momentum) md += ` | Momentum: ${d.metrics.momentum}`;
    if (d.metrics.activityScore != null) md += ` | Activity: ${d.metrics.activityScore}/100`;
    md += `\n\n`;

    // Metrics table
    const m = d.metrics;
    md += `| Metric | Value |\n|--------|-------|\n`;
    if (m.docsCreated != null) md += `| Docs Created | ${m.docsCreated} |\n`;
    if (m.docsEdited != null) md += `| Docs Edited | ${m.docsEdited} |\n`;
    if (m.breakouts != null) md += `| AI Breakouts | ${m.breakouts} |\n`;
    if (m.callsLogged != null) md += `| Calls Logged | ${m.callsLogged} |\n`;
    if (m.callWinRate != null) md += `| Call Win Rate | ${m.callWinRate}% |\n`;
    if (m.avgCallScore != null) md += `| Avg Call Score | ${m.avgCallScore} |\n`;
    if (m.kpiAttainment != null) md += `| KPI Attainment | ${m.kpiAttainment}% |\n`;
    md += `\n`;

    // Summary
    md += `${d.summary || p.summary || ""}\n\n`;

    // Trajectory
    if (p.trajectory) {
      md += `**Trajectory:** ${p.trajectory}\n\n`;
    }

    // Highlights
    if (d.highlights && d.highlights.length > 0) {
      md += `**Highlights:**\n`;
      for (const h of d.highlights) {
        md += `- [${h.type}] ${h.text}${h.date ? ` (${h.date})` : ""}\n`;
      }
      md += `\n`;
    }

    // Decisions
    if (p.decisions && p.decisions.length > 0) {
      md += `**Key Decisions:**\n`;
      for (const dec of p.decisions) {
        md += `- [${dec.impact}] ${dec.decision} (${dec.date})\n`;
      }
      md += `\n`;
    }

    // Recommendations
    if (p.recommendations && p.recommendations.length > 0) {
      md += `**Recommendations:**\n`;
      for (const r of p.recommendations) {
        md += `- ${r}\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  return md;
}
