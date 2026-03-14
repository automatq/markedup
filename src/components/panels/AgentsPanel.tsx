"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  UserPlus,
  Check,
} from "lucide-react";
import { AGENTS, AgentRole, AgentAssignment } from "@/lib/agents";

interface Message {
  role: "user" | "assistant";
  content: string;
  agentId?: string;
}

interface AgentsPanelProps {
  open: boolean;
  onClose: () => void;
  getDocumentContent: () => string;
  onInsertSuggestion?: (text: string) => void;
}

/* ── Agent Card with assignment ── */
function AgentCard({
  agent,
  assignment,
  onClick,
  onAssign,
}: {
  agent: AgentRole;
  assignment?: AgentAssignment;
  onClick: () => void;
  onAssign: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-4 py-3.5 transition-all hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
      <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
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
          <p className="text-[11px] text-black/40 dark:text-white/40 truncate">
            {agent.description}
          </p>
        </div>
      </button>
      {/* Assignment indicator */}
      <button
        onClick={(e) => { e.stopPropagation(); onAssign(); }}
        className="shrink-0 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        title={assignment ? `Assigned to ${assignment.userName}` : "Assign user"}
      >
        {assignment ? (
          <>
            {assignment.userAvatar ? (
              <img src={assignment.userAvatar} alt="" className="h-4 w-4 rounded-full" />
            ) : (
              <div className="h-4 w-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[8px]">
                {assignment.userName.charAt(0)}
              </div>
            )}
            <span className="text-black/50 dark:text-white/50 max-w-[60px] truncate">
              {assignment.userName.split(" ")[0]}
            </span>
          </>
        ) : (
          <UserPlus className="h-3.5 w-3.5 text-black/25 dark:text-white/25 group-hover:text-black/50 dark:group-hover:text-white/50" />
        )}
      </button>
    </div>
  );
}

/* ── Assignment Picker Dropdown ── */
function AssignmentPicker({
  agent,
  currentAssignment,
  onAssign,
  onClose,
}: {
  agent: AgentRole;
  currentAssignment?: AgentAssignment;
  onAssign: (assignment: AgentAssignment | null) => void;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(search)}`);
        if (res.ok) setUsers(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [search]);

  return (
    <div className="absolute right-0 top-0 z-10 w-64 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up">
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40 mb-2">
          Assign {agent.title} to user
        </p>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full h-8 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25"
        />
      </div>
      <div className="max-h-48 overflow-y-auto px-1.5 pb-1.5">
        {/* Unassign option */}
        {currentAssignment && (
          <button
            onClick={() => { onAssign(null); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <X className="h-3 w-3" />
            Remove assignment
          </button>
        )}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-black/20 dark:text-white/20" />
          </div>
        ) : (
          users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onAssign({ agentId: agent.id, userId: user.id, userName: user.name, userAvatar: user.avatar });
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[9px] font-medium">
                  {user.name.charAt(0)}
                </div>
              )}
              <span className="flex-1 text-left truncate">{user.name}</span>
              {currentAssignment?.userId === user.id && (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </button>
          ))
        )}
        {!loading && users.length === 0 && (
          <p className="text-[11px] text-black/30 dark:text-white/30 text-center py-3">
            No users found
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Message Bubble with Insert button ── */
function MessageBubble({
  msg,
  agent,
  onInsert,
}: {
  msg: Message;
  agent?: AgentRole;
  onInsert?: (text: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-black dark:bg-white px-3.5 py-2.5">
          <p className="text-sm text-white dark:text-black whitespace-pre-wrap">
            {msg.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 group/msg">
      {agent && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-bl-md border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3.5 py-2.5">
          <p className="text-sm text-black/80 dark:text-white/75 whitespace-pre-wrap">
            {msg.content}
          </p>
        </div>
        {/* Insert into document button */}
        {onInsert && (
          <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <button
              onClick={() => onInsert(msg.content)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Insert into document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Panel ── */
export function AgentsPanel({
  open,
  onClose,
  getDocumentContent,
  onInsertSuggestion,
}: AgentsPanelProps) {
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, AgentAssignment>>({});
  const [assigningAgent, setAssigningAgent] = useState<AgentRole | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const selectAgent = useCallback((agent: AgentRole) => {
    setActiveAgent(agent);
    setMessages([]);
    setInput("");
    setAssigningAgent(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const goBack = useCallback(() => {
    setActiveAgent(null);
    setMessages([]);
    setInput("");
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeAgent || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id,
          message: userMsg.content,
          documentContent: getDocumentContent(),
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            agentId: activeAgent.id,
          },
        ]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${errData.error || "Failed to get response"}`,
            agentId: activeAgent.id,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Network request failed. Please try again.",
          agentId: activeAgent.id,
        },
      ]);
    }

    setLoading(false);
    scrollToBottom();
  }, [input, activeAgent, loading, messages, getDocumentContent, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  if (!open) return null;

  return (
    <div className="relative w-[420px] shrink-0 border-l border-black/8 dark:border-white/10 bg-white dark:bg-black flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
        <div className="flex items-center gap-2">
          {activeAgent ? (
            <>
              <button
                onClick={goBack}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: activeAgent.color }}
              >
                {activeAgent.avatar}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-black dark:text-white">
                  {activeAgent.name}
                </h2>
                <p className="text-[10px] text-black/40 dark:text-white/40 -mt-0.5">
                  {activeAgent.title}
                  {assignments[activeAgent.id] && (
                    <span> · Assigned to {assignments[activeAgent.id].userName.split(" ")[0]}</span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-black/40 dark:text-white/40" />
              <h2 className="text-sm font-semibold text-black dark:text-white">
                AI Agents
              </h2>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeAgent && messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!activeAgent ? (
        /* Agent selection */
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-black/50 dark:text-white/50 mb-4">
            Choose an AI agent to collaborate with. They can see your
            document and provide role-specific feedback. Assign agents to
            team members for role-based reviews.
          </p>
          <div className="space-y-2 relative">
            {AGENTS.map((agent) => (
              <div key={agent.id} className="relative">
                <AgentCard
                  agent={agent}
                  assignment={assignments[agent.id]}
                  onClick={() => selectAgent(agent)}
                  onAssign={() =>
                    setAssigningAgent(
                      assigningAgent?.id === agent.id ? null : agent
                    )
                  }
                />
                {assigningAgent?.id === agent.id && (
                  <AssignmentPicker
                    agent={agent}
                    currentAssignment={assignments[agent.id]}
                    onAssign={(a) => {
                      setAssignments((prev) => {
                        const next = { ...prev };
                        if (a) {
                          next[agent.id] = a;
                        } else {
                          delete next[agent.id];
                        }
                        return next;
                      });
                    }}
                    onClose={() => setAssigningAgent(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Chat view */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: activeAgent.color }}
                >
                  {activeAgent.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {activeAgent.name} · {activeAgent.title}
                  </p>
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1 max-w-[280px]">
                    {activeAgent.description}. Ask a question or request
                    feedback on your document.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {activeAgent.id === "ceo" && (
                    <>
                      <QuickPrompt text="Review this document" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="What's the strategic risk?" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="Sharpen the vision" onClick={(t) => setInput(t)} />
                    </>
                  )}
                  {activeAgent.id === "cro" && (
                    <>
                      <QuickPrompt text="Review this document" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="How does this impact revenue?" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="Improve the messaging" onClick={(t) => setInput(t)} />
                    </>
                  )}
                  {activeAgent.id === "cto" && (
                    <>
                      <QuickPrompt text="Review this document" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="What are the technical risks?" onClick={(t) => setInput(t)} />
                      <QuickPrompt text="Suggest architecture improvements" onClick={(t) => setInput(t)} />
                    </>
                  )}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                agent={msg.role === "assistant" ? activeAgent : undefined}
                onInsert={msg.role === "assistant" ? onInsertSuggestion : undefined}
              />
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                  style={{ backgroundColor: activeAgent.color }}
                >
                  {activeAgent.avatar}
                </div>
                <div className="rounded-2xl rounded-bl-md border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-black/30 dark:text-white/30" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/8 dark:border-white/10 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${activeAgent.name}…`}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2.5 text-sm text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
                style={{ maxHeight: "120px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black transition-opacity disabled:opacity-30 hover:opacity-80"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[9px] text-black/20 dark:text-white/20 mt-1.5 text-center">
              Powered by OpenAI · Sees your document content
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function QuickPrompt({
  text,
  onClick,
}: {
  text: string;
  onClick: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(text)}
      className="rounded-full border border-black/8 dark:border-white/10 px-3 py-1.5 text-[11px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
    >
      {text}
    </button>
  );
}
