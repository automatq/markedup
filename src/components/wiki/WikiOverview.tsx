"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  BarChart3,
  Users,
  Brain,
} from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import ReactMarkdown from "react-markdown";

interface AgentSummary {
  id: string;
  name: string;
  title: string;
  color: string;
  avatar: string;
  breakoutCount: number;
  latestBreakout: {
    id: string;
    documentTitle: string;
    preview: string;
    createdAt: string;
  } | null;
}

interface WikiData {
  workspace: { id: string; name: string };
  stats: {
    documentCount: number;
    breakoutCount: number;
    agentCount: number;
  };
  recentDocuments: { id: string; title: string; updatedAt: string }[];
  agentSummaries: AgentSummary[];
}

interface WikiOverviewProps {
  workspaceId: string;
  onNavigateToDocument: (docId: string) => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-black/30 dark:text-white/30" />
        <span className="text-[10px] uppercase tracking-wider text-black/35 dark:text-white/35 font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-black dark:text-white tracking-tight">
        {value}
      </p>
    </div>
  );
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentSummary;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 p-4 hover:border-black/15 dark:hover:border-white/15 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-black dark:text-white">
            {agent.name}
          </p>
          <p className="text-[11px] text-black/40 dark:text-white/40">
            {agent.title} · {agent.breakoutCount} breakout
            {agent.breakoutCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {agent.latestBreakout ? (
        <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 px-3 py-2.5">
          <p className="text-[10px] text-black/30 dark:text-white/30 mb-1">
            Latest: {agent.latestBreakout.documentTitle}
          </p>
          <p className="text-xs text-black/60 dark:text-white/50 line-clamp-3 leading-relaxed">
            {agent.latestBreakout.preview}
          </p>
        </div>
      ) : (
        <p className="text-xs text-black/25 dark:text-white/25 italic">
          No breakout files yet
        </p>
      )}
    </div>
  );
}

export function WikiOverview({
  workspaceId,
  onNavigateToDocument,
}: WikiOverviewProps) {
  const [data, setData] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(true);

  // AI-generated content
  const [mermaidChart, setMermaidChart] = useState<string>("");
  const [advice, setAdvice] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch wiki data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/wiki?workspaceId=${workspaceId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {}
      setLoading(false);
    })();
  }, [workspaceId]);

  // Generate AI overview
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        const result = await res.json();
        setMermaidChart(result.mermaidChart || "");
        setAdvice(result.advice || "");
        setHasGenerated(true);
      }
    } catch {}
    setGenerating(false);
  }, [workspaceId]);

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
        <p className="text-sm text-black/40 dark:text-white/40">
          Failed to load workspace data.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-black/30 dark:text-white/30 mb-3">
            <Brain className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-medium">
              Business Wiki
            </span>
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
            {data.workspace.name}
          </h1>
          <p className="text-sm text-black/40 dark:text-white/40 mt-1">
            Top-down overview of your business operations, team initiatives, and
            AI-powered strategic advice.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard icon={FileText} label="Documents" value={data.stats.documentCount} />
          <StatCard icon={Sparkles} label="Breakout Files" value={data.stats.breakoutCount} />
          <StatCard icon={Users} label="AI Agents" value={data.stats.agentCount} />
        </div>

        {/* Generate Overview button */}
        <div className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-black dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing your business…
              </>
            ) : hasGenerated ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate Overview
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate AI Business Overview
              </>
            )}
          </button>
          {!hasGenerated && (
            <p className="text-[11px] text-black/30 dark:text-white/30 mt-2">
              Analyzes all documents and breakout files to create an org chart
              and strategic advice for each role.
            </p>
          )}
        </div>

        {/* Mermaid Org Chart */}
        {mermaidChart && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-black/40 dark:text-white/40" />
              Organizational Overview
            </h2>
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] p-6">
              <MermaidDiagram chart={mermaidChart} />
            </div>
          </div>
        )}

        {/* AI Advice */}
        {advice && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-black/40 dark:text-white/40" />
              Key Strategic Advice
            </h2>
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none text-black/80 dark:text-white/75 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:first:mt-0 [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_li]:leading-relaxed [&_ul]:my-1.5 [&_ol]:my-1.5 [&_strong]:text-black/90 dark:[&_strong]:text-white/85">
                <ReactMarkdown>{advice}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Agent Summaries */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-black/40 dark:text-white/40" />
            Agent Intelligence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.agentSummaries.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Recent Documents */}
        {data.recentDocuments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-black/40 dark:text-white/40" />
              Recent Documents
            </h2>
            <div className="space-y-1">
              {data.recentDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onNavigateToDocument(doc.id)}
                  className="group flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                >
                  <FileText className="h-4 w-4 text-black/25 dark:text-white/25 shrink-0" />
                  <span className="text-sm text-black/70 dark:text-white/70 truncate flex-1">
                    {doc.title || "Untitled"}
                  </span>
                  <span className="text-[10px] text-black/25 dark:text-white/25 shrink-0">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-black/15 dark:text-white/15 group-hover:text-black/40 dark:group-hover:text-white/40 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
