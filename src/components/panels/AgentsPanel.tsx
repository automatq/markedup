"use client";

import React, { useCallback, useRef, useState } from "react";
import { X, Send, ArrowLeft, Loader2, Sparkles, Trash2 } from "lucide-react";
import { AGENTS, AgentRole } from "@/lib/agents";

interface Message {
  role: "user" | "assistant";
  content: string;
  agentId?: string;
}

interface AgentsPanelProps {
  open: boolean;
  onClose: () => void;
  getDocumentContent: () => string;
}

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentRole;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-4 py-3.5 text-left transition-all hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
    >
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
  );
}

function MessageBubble({
  msg,
  agent,
}: {
  msg: Message;
  agent?: AgentRole;
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
    <div className="flex gap-2.5">
      {agent && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
      )}
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3.5 py-2.5">
        <p className="text-sm text-black/80 dark:text-white/75 whitespace-pre-wrap">
          {msg.content}
        </p>
      </div>
    </div>
  );
}

export function AgentsPanel({
  open,
  onClose,
  getDocumentContent,
}: AgentsPanelProps) {
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  const selectAgent = useCallback(
    (agent: AgentRole) => {
      setActiveAgent(agent);
      setMessages([]);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    []
  );

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
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="relative ml-auto w-96 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
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
              Choose an AI agent to collaborate with. They can see your document
              and provide role-specific feedback.
            </p>
            <div className="space-y-2">
              {AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => selectAgent(agent)}
                />
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
                    <p className="text-xs text-black/40 dark:text-white/40 mt-1 max-w-[240px]">
                      {activeAgent.description}. Ask a question or request
                      feedback on your document.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {activeAgent.id === "ceo" && (
                      <>
                        <QuickPrompt
                          text="Review this document"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="What's the strategic risk?"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="Sharpen the vision"
                          onClick={(t) => { setInput(t); }}
                        />
                      </>
                    )}
                    {activeAgent.id === "cro" && (
                      <>
                        <QuickPrompt
                          text="Review this document"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="How does this impact revenue?"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="Improve the messaging"
                          onClick={(t) => { setInput(t); }}
                        />
                      </>
                    )}
                    {activeAgent.id === "cto" && (
                      <>
                        <QuickPrompt
                          text="Review this document"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="What are the technical risks?"
                          onClick={(t) => { setInput(t); }}
                        />
                        <QuickPrompt
                          text="Suggest architecture improvements"
                          onClick={(t) => { setInput(t); }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  agent={
                    msg.role === "assistant" ? activeAgent : undefined
                  }
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
                Powered by Claude · Sees your document content
              </p>
            </div>
          </>
        )}
      </div>
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
