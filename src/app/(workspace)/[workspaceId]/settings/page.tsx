"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useOrganization } from "@clerk/nextjs";
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

export default function SettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { organization } = useOrganization();
  const workspaceId = params?.workspaceId ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [workspace, setWorkspace] = useState<{ orgId?: string | null; isPersonal?: boolean } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isCreator = user?.id === createdBy;

  // Fetch workspace info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const workspaces = await res.json();
          const ws = workspaces.find((w: any) => w.id === workspaceId);
          setWorkspace(ws || null);
        }
      } catch {}
    })();
  }, [workspaceId]);

  // Fetch members
  useEffect(() => {
    if (!workspace?.orgId) return;
    (async () => {
      try {
        const res = await fetch(`/api/organizations/members?orgId=${workspace.orgId}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
          setCreatedBy(data.createdBy);
          setOrgName(data.orgName);
        }
      } catch {}
      setLoading(false);
    })();
  }, [workspace?.orgId]);

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
      await fetch(`/api/organizations/members?orgId=${workspace.orgId}&userId=${targetUserId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch {}
  }, [workspace?.orgId]);

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
        body: JSON.stringify({ orgId: workspace.orgId }),
      });
      if (res.ok) {
        router.push("/");
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
        <p className="text-sm text-black/40 dark:text-white/40 mb-8">
          {orgName || "Manage your team and AI agents"}
        </p>

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
                      {m.userId === createdBy && (
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
                  {isCreator && m.userId !== user?.id && (
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
          {!isCreator && (
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
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-4 py-3"
                  >
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
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-black/20 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
