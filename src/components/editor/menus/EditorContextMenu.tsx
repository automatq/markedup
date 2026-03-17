"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import {
  Trash2, Copy, ClipboardPaste, Scissors, Link2,
  Sparkles, Wand2, SpellCheck, Minimize2, Maximize2,
  Languages, FileText, Lightbulb, ListChecks,
  Type, Palette, MessageSquare, ChevronRight,
} from "lucide-react";
import { COLORS, TURN_INTO, turnBlockInto, setBlockColor, deleteBlock, duplicateBlock } from "./block-actions";

interface ContextMenuState {
  x: number;
  y: number;
  blockPos: number;
  blockNode: PmNode | null;
  hasSelection: boolean;
}

export function EditorContextMenu({ editor }: { editor: Editor }) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [sub, setSub] = useState<"main" | "turnInto" | "color" | "ai" | "translate">("main");
  const [aiLoading, setAiLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for right-click on editor
  useEffect(() => {
    const pm = editor.view.dom;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) return;

      const resolved = editor.state.doc.resolve(pos.pos);
      const blockPos = resolved.depth >= 1 ? resolved.before(1) : 0;
      const blockNode = editor.state.doc.nodeAt(blockPos);
      const { from, to } = editor.state.selection;

      setMenu({
        x: e.clientX,
        y: e.clientY,
        blockPos,
        blockNode,
        hasSelection: from !== to,
      });
      setSub("main");
    };

    pm.addEventListener("contextmenu", onContextMenu);
    return () => pm.removeEventListener("contextmenu", onContextMenu);
  }, [editor]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const close = useCallback(() => { setMenu(null); setSub("main"); }, []);

  // AI action on selected text
  const runAI = useCallback(async (action: string, opts?: { targetLang?: string }) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) { close(); return; }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, ...opts }),
      });
      if (res.ok) {
        const result = await res.text();
        editor.chain().focus().deleteSelection().insertContent(result).run();
      }
    } catch (err) {
      console.error("AI action failed:", err);
    }
    setAiLoading(false);
    close();
  }, [editor, close]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.href.split("#")[0]}#pos-${menu?.blockPos ?? 0}`;
    navigator.clipboard.writeText(url);
    close();
  }, [menu, close]);

  const handleCut = useCallback(() => {
    document.execCommand("cut");
    close();
  }, [close]);

  const handleCopy = useCallback(() => {
    document.execCommand("copy");
    close();
  }, [close]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch {
      document.execCommand("paste");
    }
    close();
  }, [editor, close]);

  if (!menu) return null;

  // Position: keep menu on-screen
  const menuWidth = 220;
  const menuHeight = 400;
  const left = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const top = Math.min(menu.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl py-1.5 w-56 animate-fade-in-up"
      style={{ left, top }}
    >
      {sub === "ai" ? (
        <>
          <CtxBtn onClick={() => setSub("main")} dim>← Back</CtxBtn>
          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
          {aiLoading ? (
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="h-3.5 w-3.5 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-black/40 dark:text-white/40">Processing...</span>
            </div>
          ) : (
            <>
              <CtxBtn onClick={() => runAI("improve")}><Wand2 className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Improve writing</CtxBtn>
              <CtxBtn onClick={() => runAI("fix-spelling")}><SpellCheck className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Fix spelling & grammar</CtxBtn>
              <CtxBtn onClick={() => runAI("shorter")}><Minimize2 className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Make shorter</CtxBtn>
              <CtxBtn onClick={() => runAI("longer")}><Maximize2 className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Make longer</CtxBtn>
              <CtxBtn onClick={() => runAI("summarize")}><FileText className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Summarize</CtxBtn>
              <CtxBtn onClick={() => runAI("explain")}><Lightbulb className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Explain</CtxBtn>
              <CtxBtn onClick={() => runAI("action-items")}><ListChecks className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Find action items</CtxBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <CtxBtn onClick={() => setSub("translate")}><Languages className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Translate <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span></CtxBtn>
            </>
          )}
        </>
      ) : sub === "translate" ? (
        <>
          <CtxBtn onClick={() => setSub("ai")} dim>← Back</CtxBtn>
          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
          {["Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Chinese", "Korean", "Arabic", "Russian"].map((lang) => (
            <CtxBtn key={lang} onClick={() => runAI("translate", { targetLang: lang })}>
              <Languages className="h-3.5 w-3.5 text-black/30 dark:text-white/30" /> {lang}
            </CtxBtn>
          ))}
        </>
      ) : sub === "turnInto" ? (
        <>
          <CtxBtn onClick={() => setSub("main")} dim>← Back</CtxBtn>
          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
          {TURN_INTO.map((item) => (
            <CtxBtn key={item.type} onClick={() => { if (menu.blockNode) turnBlockInto(editor, menu.blockPos, item.type); close(); }}>
              <item.icon className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> {item.label}
            </CtxBtn>
          ))}
        </>
      ) : sub === "color" ? (
        <>
          <CtxBtn onClick={() => setSub("main")} dim>← Back</CtxBtn>
          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
          <div className="px-3 py-2.5 grid grid-cols-5 gap-2">
            {COLORS.map((c) => (
              <button key={c.name} onMouseDown={(e) => e.preventDefault()} title={c.name}
                onClick={() => { if (menu.blockNode) { setBlockColor(editor, menu.blockPos, menu.blockNode.nodeSize, c.value); close(); } }}
                className="h-7 w-7 rounded-full border-2 border-black/10 dark:border-white/10 hover:scale-110 hover:border-black/25 dark:hover:border-white/25 transition-all"
                style={{ backgroundColor: c.value || undefined, ...(c.value === "" ? { background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" } : {}) }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* AI Actions — only show when text is selected */}
          {menu.hasSelection && (
            <>
              <CtxBtn onClick={() => setSub("ai")} accent>
                <Sparkles className="h-3.5 w-3.5" /> AI Actions
                <span className="ml-auto text-[10px] text-[#c9a84c]/50 dark:text-[#d4af37]/50">→</span>
              </CtxBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
            </>
          )}

          <CtxBtn onClick={handleCopyLink}><Link2 className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Copy link to block</CtxBtn>
          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />

          <CtxBtn onClick={() => setSub("turnInto")}><Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Turn into <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span></CtxBtn>
          <CtxBtn onClick={() => setSub("color")}><Palette className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Color <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span></CtxBtn>

          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />

          <CtxBtn onClick={handleCut}><Scissors className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Cut <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘X</span></CtxBtn>
          <CtxBtn onClick={handleCopy}><Copy className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Copy <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘C</span></CtxBtn>
          <CtxBtn onClick={handlePaste}><ClipboardPaste className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Paste <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘V</span></CtxBtn>

          <div className="h-px bg-black/6 dark:bg-white/6 my-1" />

          <CtxBtn onClick={() => { if (menu.blockNode) { duplicateBlock(editor, menu.blockPos, menu.blockNode); close(); } }}>
            <Copy className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Duplicate
          </CtxBtn>
          <CtxBtn onClick={() => { if (menu.blockNode) { deleteBlock(editor, menu.blockPos, menu.blockNode.nodeSize); close(); } }} destructive>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </CtxBtn>
        </>
      )}
    </div>
  );
}

function CtxBtn({ onClick, destructive, dim, accent, children }: {
  onClick: () => void; destructive?: boolean; dim?: boolean; accent?: boolean; children: React.ReactNode;
}) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
        destructive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          : accent ? "text-[#c9a84c] dark:text-[#d4af37] hover:bg-[#c9a84c]/10 dark:hover:bg-[#d4af37]/10"
            : dim ? "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
              : "text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"
      }`}>
      {children}
    </button>
  );
}
