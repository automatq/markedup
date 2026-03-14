"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  FileText,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AGENTS, AgentRole } from "@/lib/agents";
import ReactMarkdown from "react-markdown";

interface Breakout {
  id: string;
  documentId: string;
  agentId: string;
  agentName: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface BreakoutPanelProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  getDocumentContent: () => string;
}

function AgentBreakoutSection({
  agent,
  breakouts,
  generating,
  onGenerate,
  onDelete,
}: {
  agent: AgentRole;
  breakouts: Breakout[];
  generating: boolean;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(breakouts.length > 0);
  const latest = breakouts[0]; // sorted desc by createdAt

  return (
    <div className="border border-black/6 dark:border-white/8 rounded-xl overflow-hidden">
      {/* Agent header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black dark:text-white">
            {agent.name}{" "}
            <span className="text-black/40 dark:text-white/40">
              · {agent.title}
            </span>
          </p>
          <p className="text-[10px] text-black/40 dark:text-white/40">
            {latest
              ? `Last generated ${new Date(latest.createdAt).toLocaleDateString()}`
              : "No breakout file yet"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {latest && (
            <FileText className="h-3.5 w-3.5 text-black/25 dark:text-white/25" />
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-black/30 dark:text-white/30" />
          ) : (
            <ChevronRight className="h-4 w-4 text-black/30 dark:text-white/30" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-black/6 dark:border-white/8">
          {/* Generate / Regenerate button */}
          <div className="px-4 py-2.5 flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors disabled:opacity-40"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating…
                </>
              ) : latest ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Generate Breakout
                </>
              )}
            </button>
          </div>

          {/* Breakout content */}
          {latest && (
            <div className="px-4 pb-4">
              <div className="rounded-lg border border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] p-4 max-h-[400px] overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none text-black/80 dark:text-white/75 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:my-1.5 [&_li]:text-xs [&_li]:leading-relaxed [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-black/90 dark:[&_strong]:text-white/85">
                  <ReactMarkdown>{latest.content}</ReactMarkdown>
                </div>
              </div>
              {/* Delete + metadata */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-black/30 dark:text-white/30">
                  {new Date(latest.createdAt).toLocaleString()}
                </p>
                <button
                  onClick={() => onDelete(latest.id)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-red-500/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BreakoutPanel({
  open,
  onClose,
  documentId,
  documentTitle,
  getDocumentContent,
}: BreakoutPanelProps) {
  const [breakouts, setBreakouts] = useState<Breakout[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAgent, setGeneratingAgent] = useState<string | null>(null);

  // Fetch breakouts
  const fetchBreakouts = useCallback(async () => {
    try {
      const res = await fetch(`/api/breakouts?documentId=${documentId}`);
      if (res.ok) {
        setBreakouts(await res.json());
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchBreakouts();
    }
  }, [open, fetchBreakouts]);

  const handleGenerate = useCallback(
    async (agent: AgentRole) => {
      setGeneratingAgent(agent.id);
      try {
        const res = await fetch("/api/breakouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            agentId: agent.id,
            documentContent: getDocumentContent(),
            documentTitle,
          }),
        });
        if (res.ok) {
          await fetchBreakouts();
        }
      } catch {
        /* ignore */
      }
      setGeneratingAgent(null);
    },
    [documentId, documentTitle, getDocumentContent, fetchBreakouts]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/breakouts?id=${id}`, { method: "DELETE" });
        setBreakouts((prev) => prev.filter((b) => b.id !== id));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const handleGenerateAll = useCallback(async () => {
    for (const agent of AGENTS) {
      await handleGenerate(agent);
    }
  }, [handleGenerate]);

  if (!open) return null;

  const breakoutsByAgent = (agentId: string) =>
    breakouts.filter((b) => b.agentId === agentId);

  return (
    <div className="relative w-[480px] shrink-0 border-l border-black/8 dark:border-white/10 bg-white dark:bg-black flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-black/40 dark:text-white/40" />
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Breakout Files
          </h2>
          <span className="text-[10px] text-black/30 dark:text-white/30 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">
            {breakouts.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleGenerateAll}
            disabled={generatingAgent !== null}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <Sparkles className="h-3 w-3" />
            Generate All
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-black/20 dark:text-white/20" />
          </div>
        ) : (
          <>
            <p className="text-xs text-black/40 dark:text-white/40 mb-2">
              Each agent generates a role-specific action plan from your
              document. Breakout files are visible to the entire team.
            </p>
            {AGENTS.map((agent) => (
              <AgentBreakoutSection
                key={agent.id}
                agent={agent}
                breakouts={breakoutsByAgent(agent.id)}
                generating={generatingAgent === agent.id}
                onGenerate={() => handleGenerate(agent)}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
