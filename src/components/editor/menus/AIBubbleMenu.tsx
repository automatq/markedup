"use client";

import React, { useCallback, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Sparkles,
  Wand2,
  SpellCheck,
  Minimize2,
  Maximize2,
  Languages,
  FileText,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  Loader2,
  Check,
  X,
  ListChecks,
} from "lucide-react";

type AIState = "idle" | "loading" | "preview";

const LANGUAGES = [
  "Spanish", "French", "German", "Portuguese", "Italian",
  "Japanese", "Chinese", "Korean", "Arabic", "Hindi", "Russian",
];

export function AIBubbleMenu({ editor }: { editor: Editor }) {
  const [state, setState] = useState<AIState>("idle");
  const [result, setResult] = useState("");
  const [openDropdown, setOpenDropdown] = useState<"tone" | "more" | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const originalText = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const runAction = useCallback(
    async (action: string, opts?: { targetLang?: string; customPrompt?: string }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, " ");
      if (!text.trim()) return;

      originalText.current = text;
      setState("loading");
      setResult("");
      setOpenDropdown(null);

      try {
        abortRef.current = new AbortController();
        const res = await fetch("/api/ai/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, action, ...opts }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setState("idle");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }

        setState("preview");
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("AI action failed:", err);
        }
        setState("idle");
      }
    },
    [editor]
  );

  const handleAccept = useCallback(() => {
    if (!result) return;
    editor.chain().focus().deleteSelection().insertContent(result).run();
    setState("idle");
    setResult("");
  }, [editor, result]);

  const handleDiscard = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
    setResult("");
    setOpenDropdown(null);
  }, []);

  const handleCustomSubmit = useCallback(() => {
    if (!customPrompt.trim()) return;
    runAction("custom", { customPrompt: customPrompt.trim() });
    setCustomPrompt("");
  }, [customPrompt, runAction]);

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state: s }: { editor: Editor; state: any }) => {
        if (e.isActive("codeBlock")) return false;
        const { from, to } = s.selection;
        return from !== to;
      }}
    >
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl overflow-hidden">
        {/* Loading state */}
        {state === "loading" && (
          <div className="flex items-center gap-2 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#c9a84c] dark:text-[#d4af37]" />
            <span className="text-xs text-black/50 dark:text-white/50">AI is thinking...</span>
            <button
              onClick={handleDiscard}
              className="ml-2 text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Preview state */}
        {state === "preview" && (
          <div className="max-w-md">
            <div className="px-4 py-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-black/40 dark:text-white/40 mb-1.5 font-medium">AI Result</p>
              <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed whitespace-pre-wrap">{result}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 border-t border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02]">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Check className="h-3 w-3" /> Accept
              </button>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-3 w-3" /> Discard
              </button>
              <button
                onClick={() => { setState("idle"); setResult(""); }}
                className="ml-auto text-[10px] text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Idle state — action buttons */}
        {state === "idle" && (
          <div className="flex items-center">
            {/* Primary actions */}
            <div className="flex items-center gap-0.5 px-1.5 py-1.5">
              <AIBtn icon={Wand2} label="Improve" onClick={() => runAction("improve")} />
              <AIBtn icon={SpellCheck} label="Fix" onClick={() => runAction("fix-spelling")} />
              <AIBtn icon={Minimize2} label="Shorter" onClick={() => runAction("shorter")} />
              <AIBtn icon={Maximize2} label="Longer" onClick={() => runAction("longer")} />
              <AIBtn icon={ListChecks} label="Actions" onClick={() => runAction("action-items")} />
              <AIBtn icon={Sparkles} label="Ghost Write" onClick={() => runAction("ghost-write")} />

              <div className="w-px h-5 bg-black/8 dark:bg-white/8 mx-0.5" />

              {/* Tone dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === "tone" ? null : "tone")}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Tone <ChevronDown className="h-3 w-3" />
                </button>
                {openDropdown === "tone" && (
                  <div className="absolute top-full left-0 mt-1 z-50 w-40 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-xl py-1">
                    {(["professional", "casual", "friendly", "direct"] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => runAction(tone)}
                        className="flex w-full px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 capitalize transition-colors"
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* More dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === "more" ? null : "more")}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#c9a84c] dark:text-[#d4af37] hover:bg-[#c9a84c]/10 dark:hover:bg-[#d4af37]/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI <ChevronDown className="h-3 w-3" />
                </button>
                {openDropdown === "more" && (
                  <div className="absolute top-full right-0 mt-1 z-50 w-56 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-xl py-1 overflow-hidden">
                    <button onClick={() => runAction("summarize")} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Summarize
                    </button>
                    <button onClick={() => runAction("explain")} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Lightbulb className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Explain
                    </button>

                    <div className="h-px bg-black/6 dark:bg-white/6 my-1" />

                    {/* Translate submenu */}
                    <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                      Translate to
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => runAction("translate", { targetLang: lang })}
                          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <Languages className="h-3 w-3 text-black/30 dark:text-white/30" /> {lang}
                        </button>
                      ))}
                    </div>

                    <div className="h-px bg-black/6 dark:bg-white/6 my-1" />

                    {/* Custom prompt */}
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-medium text-black/30 dark:text-white/30 mb-1.5">Custom instruction</p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
                          placeholder="e.g. Make it funnier"
                          className="flex-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] px-2.5 py-1.5 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10"
                        />
                        <button
                          onClick={handleCustomSubmit}
                          disabled={!customPrompt.trim()}
                          className="rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                        >
                          Go
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}

/* ── Button helper ── */

function AIBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
      title={label}
    >
      <Icon className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
      {label}
    </button>
  );
}
