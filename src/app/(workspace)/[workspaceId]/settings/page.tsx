"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  Users,
  Loader2,
  Trash2,
  Plus,
  LogOut,
  Shield,
  Sparkles,
  X,
  Check,
  FileText,
  BookOpen,
  ChevronDown,
  Search,
} from "lucide-react";

interface Member {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  joinedAt: number;
}

interface AgentConfig {
  id: string;
  roleId: string;
  name: string;
  title: string;
  color: string;
  avatar: string;
  description: string;
  systemPrompt: string;
}

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

function CreateAgentForm({
  workspaceId,
  onCreated,
  onCancel,
}: {
  workspaceId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !description.trim() || !systemPrompt.trim()) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/agents/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          roleId: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: name.trim(),
          title: title.trim(),
          color,
          avatar: name.trim().charAt(0).toUpperCase(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
        }),
      });
      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create agent");
      }
    } catch {
      setError("Failed to create agent");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-black/8 dark:border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black dark:text-white">New Agent</h3>
        <button type="button" onClick={onCancel} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dylan"
            className="mt-1 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/25"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Title / Role</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CEO"
            className="mt-1 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/25"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Color</label>
        <div className="flex gap-2 mt-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-black/20 dark:ring-white/20 dark:ring-offset-black" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Strategy, vision, and high-level decision making"
          className="mt-1 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/25"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Describe the agent's personality, expertise, and how it should analyze documents..."
          rows={4}
          className="mt-1 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-black/20 dark:focus:border-white/25 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Create Agent
      </button>
    </form>
  );
}

function AgentCard({
  agent,
  workspaceId,
  onDelete,
}: {
  agent: AgentConfig;
  workspaceId: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black dark:text-white">
            {agent.name}{" "}
            <span className="text-black/40 dark:text-white/40">· {agent.title}</span>
          </p>
          <p className="text-[11px] text-black/40 dark:text-white/40 truncate">
            {agent.description}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Training docs"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={onDelete}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-black/20 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <AgentTrainingSection agentId={agent.id} workspaceId={workspaceId} />
      )}
    </div>
  );
}

interface TrainingDoc {
  id: string;
  documentId: string;
  title: string;
  addedAt: string;
}

function AgentTrainingSection({
  agentId,
  workspaceId,
}: {
  agentId: string;
  workspaceId: string;
}) {
  const [docs, setDocs] = useState<TrainingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allDocs, setAllDocs] = useState<{ id: string; title: string }[]>([]);
  const [allDocsLoaded, setAllDocsLoaded] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const fetchTraining = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/training?agentId=${agentId}`);
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  // Load workspace docs for the picker
  useEffect(() => {
    if (!searchOpen || allDocsLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          setAllDocs(data.map((d: any) => ({ id: d.id, title: d.title })));
        }
      } catch {}
      setAllDocsLoaded(true);
    })();
  }, [searchOpen, allDocsLoaded, workspaceId]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  const linkedIds = new Set(docs.map((d) => d.documentId));
  const filteredDocs = allDocs.filter(
    (d) => !linkedIds.has(d.id) && d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async (documentId: string) => {
    setAdding(true);
    try {
      const res = await fetch("/api/agents/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, documentId }),
      });
      if (res.ok) {
        await fetchTraining();
        setSearchQuery("");
      }
    } catch {}
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/agents/training?id=${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {}
  };

  return (
    <div className="mt-3 pt-3 border-t border-black/6 dark:border-white/6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 text-black/30 dark:text-white/30" />
          <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">
            Training Docs
          </span>
          {docs.length > 0 && (
            <span className="text-[9px] text-black/25 dark:text-white/25 bg-black/5 dark:bg-white/5 rounded-full px-1.5 py-0.5">
              {docs.length}
            </span>
          )}
        </div>
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1 text-[10px] text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors px-1.5 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>

          {searchOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-72 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-xl">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-black/30 dark:text-white/30" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] pl-7 pr-3 py-1.5 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto px-1 pb-1">
                {!allDocsLoaded ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-black/20 dark:text-white/20" />
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[11px] text-black/30 dark:text-white/30">
                    {allDocs.length === 0 ? "No documents in workspace" : "No matching documents"}
                  </p>
                ) : (
                  filteredDocs.slice(0, 10).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleAdd(doc.id)}
                      disabled={adding}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-black/25 dark:text-white/25" />
                      <span className="truncate">{doc.title || "Untitled"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-black/15 dark:text-white/15" />
        </div>
      ) : docs.length === 0 ? (
        <p className="text-[11px] text-black/25 dark:text-white/25 py-1">
          No training docs yet — add documents to give this agent specialized knowledge.
        </p>
      ) : (
        <div className="space-y-1">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <FileText className="h-3 w-3 shrink-0 text-black/25 dark:text-white/25" />
              <span className="flex-1 truncate text-[11px] text-black/50 dark:text-white/50">
                {doc.title || "Untitled"}
              </span>
              <button
                onClick={() => handleRemove(doc.id)}
                className="hidden group-hover:flex h-5 w-5 items-center justify-center shrink-0 rounded text-black/20 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const workspaceId = params?.workspaceId ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [workspace, setWorkspace] = useState<{ orgId?: string | null; isPersonal?: boolean; name?: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [membersError, setMembersError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const isOwner = user?.id === ownerId;

  // Fetch workspace info + members in one flow
  useEffect(() => {
    (async () => {
      try {
        // 1. Get workspace to find orgId
        const wsRes = await fetch("/api/workspaces");
        if (!wsRes.ok) {
          setMembersError(true);
          setLoading(false);
          return;
        }
        const workspaces = await wsRes.json();
        const ws = workspaces.find((w: any) => w.id === workspaceId);
        setWorkspace(ws || null);

        if (!ws?.orgId) {
          setLoading(false);
          return;
        }

        // Also set name from workspace as initial fallback
        if (ws.name) setOrgName(ws.name);

        // 2. Fetch members using the orgId from DB
        const membersRes = await fetch(`/api/organizations/members?orgId=${ws.orgId}`);
        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members);
          setOwnerId(data.ownerId);
          if (data.orgName) setOrgName(data.orgName);
        } else {
          setMembersError(true);
        }
      } catch {
        setMembersError(true);
      }
      setLoading(false);
    })();
  }, [workspaceId]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/config?workspaceId=${workspaceId}`);
      if (res.ok) setAgents(await res.json());
    } catch {}
    setAgentsLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRemoveMember = useCallback(async (targetUserId: string) => {
    if (!workspace?.orgId) return;
    if (!confirm("Remove this member from the group?")) return;
    try {
      await fetch(`/api/organizations/members?orgId=${workspace?.orgId}&userId=${targetUserId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch {}
  }, [workspace?.orgId]);

  const handleRenameSave = useCallback(async () => {
    if (!workspace?.orgId || !nameInput.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: workspace?.orgId, name: nameInput.trim() }),
      });
      if (res.ok) {
        setOrgName(nameInput.trim());
        setEditingName(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to rename");
      }
    } catch {}
    setSavingName(false);
  }, [workspace?.orgId, nameInput]);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    if (!confirm("Delete this agent?")) return;
    try {
      await fetch(`/api/agents/config?id=${agentId}`, { method: "DELETE" });
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    } catch {}
  }, []);

  const handleLeaveGroup = useCallback(async () => {
    if (!workspace?.orgId) return;
    if (!confirm("Are you sure you want to leave this group? You will lose access to all shared documents.")) return;
    setLeaving(true);
    try {
      const res = await fetch("/api/organizations/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: workspace?.orgId }),
      });
      if (res.ok) {
        // Redirect to next available workspace instead of landing page
        try {
          const wsRes = await fetch("/api/workspaces");
          if (wsRes.ok) {
            const workspaces = await wsRes.json();
            const next = workspaces.find((w: any) => w.id !== workspaceId);
            if (next) {
              router.push(`/${next.id}`);
              return;
            }
          }
        } catch {}
        router.push("/onboarding");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to leave group");
      }
    } catch {}
    setLeaving(false);
  }, [workspace?.orgId, router]);

  if (workspace?.isPersonal) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-10">
          <button onClick={() => router.push(`/${workspaceId}`)} className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Personal Space</h1>
          <p className="text-sm text-black/40 dark:text-white/40">This is your personal workspace. Group settings are available on team workspaces.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-10">
        {/* Back button */}
        <button
          onClick={() => router.push(`/${workspaceId}`)}
          className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
        </button>

        {/* Header */}
        <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight mb-1">
          Group Settings
        </h1>

        {/* Group Name */}
        <div className="mb-8">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSave();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="rounded-lg border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-black dark:text-white outline-none focus:border-black/25 dark:focus:border-white/25"
              />
              <button
                onClick={handleRenameSave}
                disabled={savingName}
                className="flex items-center gap-1 rounded-lg bg-black dark:bg-white px-3 py-1.5 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Save
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-black/60 dark:text-white/60">
                {orgName || workspace?.name || "Loading..."}
              </p>
              {isOwner && (
                <button
                  onClick={() => { setNameInput(orgName); setEditingName(true); }}
                  className="text-[10px] font-medium text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                >
                  Rename
                </button>
              )}
            </div>
          )}
        </div>

        {/* Members Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-lg font-semibold text-black dark:text-white">Members</h2>
            <span className="text-xs text-black/30 dark:text-white/30 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">
              {members.length}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-black/20 dark:text-white/20" />
            </div>
          ) : membersError ? (
            <div className="rounded-xl border border-red-200/50 dark:border-red-500/10 bg-red-50/50 dark:bg-red-500/5 px-4 py-3 text-xs text-red-500">
              Failed to load members. Try refreshing the page.
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-medium text-black/50 dark:text-white/50">
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {m.name}
                      {m.userId === ownerId && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 bg-black/5 dark:bg-white/5 rounded px-1.5 py-0.5">
                          Owner
                        </span>
                      )}
                      {m.userId === user?.id && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-indigo-500/60 bg-indigo-500/5 rounded px-1.5 py-0.5">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-black/30 dark:text-white/30 truncate">{m.email}</p>
                  </div>
                  {isOwner && m.userId !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-red-500/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Leave group */}
          {isOwner ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-black/6 dark:border-white/8 px-4 py-3">
              <Shield className="h-3.5 w-3.5 text-black/30 dark:text-white/30 shrink-0" />
              <p className="text-xs text-black/40 dark:text-white/40">
                You are the group owner. Owners cannot leave their own group.
              </p>
            </div>
          ) : (
            <button
              onClick={handleLeaveGroup}
              disabled={leaving}
              className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {leaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Leave Group
            </button>
          )}
        </section>

        {/* AI Agents Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-lg font-semibold text-black dark:text-white">AI Agents</h2>
            <span className="text-xs text-black/30 dark:text-white/30 bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">
              {agents.length}
            </span>
          </div>

          {agentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-black/20 dark:text-white/20" />
            </div>
          ) : (
            <>
              {agents.length === 0 && !showCreateAgent && (
                <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-8 text-center mb-4">
                  <Sparkles className="h-6 w-6 text-black/15 dark:text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-black/40 dark:text-white/40 mb-1">No agents yet</p>
                  <p className="text-xs text-black/25 dark:text-white/25">
                    Create AI agents with custom roles and personalities for your team.
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    workspaceId={workspaceId}
                    onDelete={() => handleDeleteAgent(agent.id)}
                  />
                ))}
              </div>

              {showCreateAgent ? (
                <CreateAgentForm
                  workspaceId={workspaceId}
                  onCreated={() => {
                    setShowCreateAgent(false);
                    fetchAgents();
                  }}
                  onCancel={() => setShowCreateAgent(false)}
                />
              ) : (
                <button
                  onClick={() => setShowCreateAgent(true)}
                  className="flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/10 px-4 py-2 text-xs font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Agent
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
