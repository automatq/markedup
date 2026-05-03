"use client";

import React, { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Check, X, ChevronDown } from "lucide-react";

interface SuggestionControlsProps {
  editor: Editor | null;
  active: boolean;
}

interface SuggestionInfo {
  id: string;
  type: string;
  userName: string;
  text: string;
}

export function SuggestionControls({ editor, active }: SuggestionControlsProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionInfo[]>([]);

  useEffect(() => {
    if (!editor || !active) return;

    const collect = () => {
      const seen = new Map<string, SuggestionInfo>();
      editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
          if (mark.type.name !== "suggestion") continue;
          const id = mark.attrs.id;
          if (!id || seen.has(id)) continue;
          seen.set(id, {
            id,
            type: mark.attrs.type || "insert",
            userName: mark.attrs.userName || "User",
            text: (node.text || "").slice(0, 40),
          });
        }
      });
      setSuggestions(Array.from(seen.values()));
    };

    collect();
    const handler = () => collect();
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, active]);

  if (!editor || !active) return null;

  const handleAccept = (id: string) => {
    (editor as any).commands.acceptSuggestion(id);
  };

  const handleReject = (id: string) => {
    (editor as any).commands.rejectSuggestion(id);
  };

  const handleAcceptAll = () => {
    (editor as any).commands.acceptAllSuggestions();
  };

  const handleRejectAll = () => {
    (editor as any).commands.rejectAllSuggestions();
  };

  const count = suggestions.length;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl overflow-hidden min-w-[220px]">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
        >
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium text-black dark:text-white flex-1 text-left">
            Suggesting · {count} change{count !== 1 ? "s" : ""}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-black/30 dark:text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && count > 0 && (
          <>
            <div className="max-h-64 overflow-y-auto border-t border-black/6 dark:border-white/6">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] border-b border-black/[0.04] dark:border-white/[0.04] last:border-b-0"
                >
                  <span
                    className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${
                      s.type === "insert"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : s.type === "delete"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {s.type}
                  </span>
                  <span className="flex-1 text-xs text-black/60 dark:text-white/60 truncate">
                    {s.text}
                  </span>
                  <button
                    onClick={() => handleAccept(s.id)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-emerald-500/10 text-emerald-500"
                    title="Accept"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleReject(s.id)}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-red-500/10 text-red-500"
                    title="Reject"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-black/6 dark:border-white/6 px-3 py-2">
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Accept all
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-700 dark:text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Reject all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
