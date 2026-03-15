"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Target,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ──────────────────── Types ──────────────────── */

interface Digest {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  metrics: {
    docsCreated?: number;
    docsEdited?: number;
    breakouts?: number;
    callsLogged?: number;
    callWinRate?: number;
    avgCallScore?: number;
    kpiAttainment?: number | null;
    momentum?: "accelerating" | "steady" | "decelerating" | "stalled";
  };
  highlights: { type: string; text: string; date?: string }[];
  payload: {
    headline?: string;
    trajectory?: string;
    summary?: string;
    metrics?: Record<string, unknown>;
    highlights?: { type: string; text: string; date?: string }[];
    recommendations?: string[];
  };
  createdAt: string;
}

/* ──────────────────── Page ──────────────────── */

export default function OperationsChronicle() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId ?? "";

  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [period, setPeriod] = useState("daily");
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
        const url = `/api/operations?workspaceId=${workspaceId}&period=${period}&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
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

  const handleGenerate = async (genPeriod: string) => {
    if (!workspaceId || generating) return;
    setGenerating(genPeriod);
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, period: genPeriod }),
      });
      if (res.ok) {
        // Refresh the list
        await fetchDigests();
      }
    } catch (err) {
      console.error("Failed to generate digest:", err);
    } finally {
      setGenerating(null);
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

  const momentumIcon = (m?: string) => {
    switch (m) {
      case "accelerating":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "decelerating":
        return <TrendingDown className="h-4 w-4 text-amber-500" />;
      case "stalled":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-black/40 dark:text-white/40" />;
    }
  };

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
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-black/[0.08] dark:bg-white/[0.08]" />

            <div className="space-y-6">
              {digests.map((digest, i) => (
                <DigestEntry
                  key={digest.id}
                  digest={digest}
                  expanded={expandedIds.has(digest.id)}
                  onToggle={() => toggleExpand(digest.id)}
                  momentumIcon={momentumIcon}
                  highlightIcon={highlightIcon}
                  isFirst={i === 0}
                />
              ))}
            </div>

            {/* Load more */}
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
          Generate your first {period} digest to start documenting your business journey.
          The AI will analyze all workspace activity and create a narrative summary.
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
  momentumIcon,
  highlightIcon,
  isFirst,
}: {
  digest: Digest;
  expanded: boolean;
  onToggle: () => void;
  momentumIcon: (m?: string) => React.ReactNode;
  highlightIcon: (t: string) => React.ReactNode;
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
              </div>
              <CardTitle className="text-sm leading-snug">
                {p.headline || "Operations Digest"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-none">
              {momentumIcon(m.momentum)}
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-black/30 dark:text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-black/30 dark:text-white/30" />
              )}
            </div>
          </div>

          {/* Metrics row — always visible */}
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
