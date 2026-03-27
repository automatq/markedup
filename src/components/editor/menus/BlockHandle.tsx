"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import {
  GripVertical, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Palette, Type, type LucideIcon,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Code2, Table, ChevronRight, Info, ImageIcon, Minus,
  Highlighter, Sparkles, Bold, Italic, Underline, Strikethrough,
  Sigma, GitBranch, Columns2, Columns3, Smile, Calendar,
  Music, Film, FileText, AtSign, LayoutTemplate,
} from "lucide-react";
import {
  filterSlashCommands,
  executeCommandOnBlock,
  type SlashCommandItem,
} from "./slash-command";
import {
  COLORS, TURN_INTO, findBlockPos, turnBlockInto,
} from "./block-actions";

/* ── Icon map for block picker ── */

const BLOCK_ICON_MAP: Record<string, LucideIcon> = {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, CheckSquare,
  Table, ChevronRight, Highlighter, Code, Code2, Info, ImageIcon, Minus,
  Sparkles, Type, Bold, Italic, Underline, Strikethrough,
  Sigma, GitBranch, Columns2, Columns3, Smile, Calendar,
  Music, Film, FileText, AtSign, LayoutTemplate, Palette,
};

const CATEGORY_LABELS: Record<string, string> = {
  text: "Text",
  lists: "Lists",
  blocks: "Blocks",
  media: "Media",
  advanced: "Advanced",
  inline: "Inline",
  color: "Colors",
};

/**
 * BlockHandleContent — Pure UI rendered inside Tiptap's DragHandle.
 * All hover detection, positioning, and drag-and-drop are handled by the
 * official @tiptap/extension-drag-handle-react. This component only provides:
 * - + button (block picker)
 * - Grip icon (visual, drag handled by DragHandle parent)
 * - Right-click context menu (turn into, color, delete, duplicate, move)
 */
export function BlockHandleContent({
  editor,
  currentNode,
  currentNodePos,
}: {
  editor: Editor;
  currentNode: PmNode | null;
  currentNodePos: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSub, setMenuSub] = useState<"main" | "turnInto" | "color">("main");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerIndex, setPickerIndex] = useState(0);

  // Snapshot the block + click position when menu/picker opens
  const [lockedNode, setLockedNode] = useState<PmNode | null>(null);
  const [lockedPos, setLockedPos] = useState(-1);
  const [menuClickPos, setMenuClickPos] = useState({ x: 0, y: 0 });
  const [pickerClickPos, setPickerClickPos] = useState({ x: 0, y: 0 });
  const activeNode = menuOpen || pickerOpen ? lockedNode : currentNode;
  const activePos = menuOpen || pickerOpen ? lockedPos : currentNodePos;

  /* ── Close on outside click ── */

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      setMenuOpen(false);
      setMenuSub("main");
      setPickerOpen(false);
      setPickerQuery("");
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen, pickerOpen]);

  /* ── + Button: open block picker ── */

  const handleAddBlock = useCallback((e?: React.MouseEvent) => {
    setLockedNode(currentNode);
    setLockedPos(currentNodePos);
    if (e) setPickerClickPos({ x: e.clientX, y: e.clientY });
    setPickerQuery("");
    setPickerIndex(0);
    setPickerOpen(true);
    setTimeout(() => pickerInputRef.current?.focus(), 50);
  }, [currentNode, currentNodePos]);

  const handleExecuteCommand = useCallback((item: SlashCommandItem) => {
    if (activePos < 0 || !activeNode) return;
    executeCommandOnBlock(editor, item, activePos, activeNode);
    setPickerOpen(false);
    setPickerQuery("");
  }, [editor, activeNode, activePos]);

  /* ── Right-click menu actions ── */

  const handleGripMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setLockedNode(currentNode);
    setLockedPos(currentNodePos);
    setMenuClickPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
    setMenuSub("main");
  }, [currentNode, currentNodePos]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuSub("main");
  }, []);

  const handleDelete = useCallback(() => {
    if (activePos < 0 || !activeNode) return;
    editor.chain().focus().deleteRange({ from: activePos, to: activePos + activeNode.nodeSize }).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  const handleDuplicate = useCallback(() => {
    if (activePos < 0 || !activeNode) return;
    editor.chain().focus().insertContentAt(activePos + activeNode.nodeSize, activeNode.toJSON()).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  const handleMoveUp = useCallback(() => {
    if (activePos <= 0 || !activeNode) return;
    const nodeJson = activeNode.toJSON();
    const prevStart = editor.state.doc.resolve(activePos - 1).before(1);
    editor.chain().focus().deleteRange({ from: activePos, to: activePos + activeNode.nodeSize }).run();
    editor.chain().focus().insertContentAt(prevStart, nodeJson).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  const handleMoveDown = useCallback(() => {
    if (activePos < 0 || !activeNode) return;
    const blockEnd = activePos + activeNode.nodeSize;
    if (blockEnd >= editor.state.doc.content.size) return;
    const nextNode = editor.state.doc.nodeAt(blockEnd);
    if (!nextNode) return;
    const nodeJson = activeNode.toJSON();
    editor.chain().focus().deleteRange({ from: activePos, to: blockEnd }).run();
    const nextNow = editor.state.doc.nodeAt(activePos);
    if (!nextNow) return;
    editor.chain().focus().insertContentAt(activePos + nextNow.nodeSize, nodeJson).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  const handleTurnInto = useCallback((type: string) => {
    if (activePos < 0) return;
    turnBlockInto(editor, activePos, type);
    closeMenu();
  }, [editor, activePos, closeMenu]);

  const handleColor = useCallback((color: string) => {
    if (activePos < 0 || !activeNode) return;
    editor.chain().focus().setTextSelection({ from: activePos + 1, to: activePos + activeNode.nodeSize - 1 }).setColor(color).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  /* ── Render ── */

  // Group picker items by category
  const pickerItems = filterSlashCommands(pickerQuery);
  const grouped: { category: string; items: { item: SlashCommandItem; globalIndex: number }[] }[] = [];
  let lastCat = "";
  pickerItems.forEach((item, index) => {
    const cat = item.category ?? "blocks";
    if (cat !== lastCat) {
      grouped.push({ category: cat, items: [] });
      lastCat = cat;
    }
    grouped[grouped.length - 1].items.push({ item, globalIndex: index });
  });

  return (
    <>
      {/* + Add block */}
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => handleAddBlock(e)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
        title="Add block below"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* ⠿ Grip — dragging is handled by the parent DragHandle component */}
      <div
        onContextMenu={handleGripMenu}
        className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to move · Right-click for menu"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Right-click menu — portaled to body so it's outside DragHandle's transform */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl py-1.5 w-52"
          style={{
            left: Math.min(menuClickPos.x, window.innerWidth - 220),
            top: Math.min(menuClickPos.y, window.innerHeight - 350),
          }}
        >
          {menuSub === "turnInto" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")} dim>← Back</MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              {TURN_INTO.map((item) => (
                <MenuBtn key={item.type} onClick={() => handleTurnInto(item.type)}>
                  <item.icon className="h-4 w-4 text-black/40 dark:text-white/40" /> {item.label}
                </MenuBtn>
              ))}
            </>
          ) : menuSub === "color" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")} dim>← Back</MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <div className="px-3 py-2.5 grid grid-cols-5 gap-2">
                {COLORS.map((c) => (
                  <button key={c.name} onMouseDown={(e) => e.preventDefault()} onClick={() => handleColor(c.value)} title={c.name}
                    className="h-7 w-7 rounded-full border-2 border-black/10 dark:border-white/10 hover:scale-110 hover:border-black/25 dark:hover:border-white/25 transition-all"
                    style={{ backgroundColor: c.value || undefined, ...(c.value === "" ? { background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" } : {}) }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <MenuBtn onClick={handleDelete} destructive><Trash2 className="h-4 w-4" /> Delete</MenuBtn>
              <MenuBtn onClick={handleDuplicate}><Copy className="h-4 w-4 text-black/40 dark:text-white/40" /> Duplicate</MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={() => setMenuSub("turnInto")}><Type className="h-4 w-4 text-black/40 dark:text-white/40" /> Turn into <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span></MenuBtn>
              <MenuBtn onClick={() => setMenuSub("color")}><Palette className="h-4 w-4 text-black/40 dark:text-white/40" /> Color <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span></MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={handleMoveUp}><ArrowUp className="h-4 w-4 text-black/40 dark:text-white/40" /> Move up <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘⇧↑</span></MenuBtn>
              <MenuBtn onClick={handleMoveDown}><ArrowDown className="h-4 w-4 text-black/40 dark:text-white/40" /> Move down <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘⇧↓</span></MenuBtn>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Block picker — portaled to body */}
      {pickerOpen && createPortal(
        <div ref={pickerRef} className="fixed z-[100] w-72 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl animate-fade-in-up overflow-hidden"
          style={{
            left: Math.min(pickerClickPos.x, window.innerWidth - 300),
            top: Math.min(pickerClickPos.y + 10, window.innerHeight - 400),
          }}>
          <div className="px-3 pt-3 pb-2">
            <input ref={pickerInputRef} type="text" value={pickerQuery} onChange={(e) => { setPickerQuery(e.target.value); setPickerIndex(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setPickerIndex((pickerIndex + 1) % Math.max(pickerItems.length, 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setPickerIndex((pickerIndex + pickerItems.length - 1) % Math.max(pickerItems.length, 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (pickerItems[pickerIndex]) handleExecuteCommand(pickerItems[pickerIndex]); }
                else if (e.key === "Escape") { e.preventDefault(); setPickerOpen(false); setPickerQuery(""); }
              }}
              placeholder="Type to filter..." className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.04] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-colors" />
          </div>
          <div className="max-h-[320px] overflow-y-auto px-1.5 pb-1.5">
            {pickerItems.length === 0 ? (
              <p className="px-3 py-4 text-xs text-black/30 dark:text-white/30 text-center">No blocks found</p>
            ) : (
              grouped.map((group) => (
                <div key={group.category}>
                  <p className="px-2 pt-1 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                    {CATEGORY_LABELS[group.category] ?? group.category}
                  </p>
                  {group.items.map(({ item, globalIndex }) => {
                    const Icon = BLOCK_ICON_MAP[item.icon];
                    return (
                      <button key={item.title} onMouseDown={(e) => e.preventDefault()} onClick={() => handleExecuteCommand(item)} onMouseEnter={() => setPickerIndex(globalIndex)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${globalIndex === pickerIndex ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white" : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"}`}>
                        {Icon && <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${globalIndex === pickerIndex ? "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white" : "bg-black/[0.04] text-black/35 dark:bg-white/[0.04] dark:text-white/35"}`}><Icon className="h-4 w-4" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium">{item.title}</p>
                          <p className="text-[10px] text-black/40 dark:text-white/40">{item.description}</p>
                        </div>
                        {item.shortcut && (
                          <span className="shrink-0 text-[10px] text-black/20 dark:text-white/20">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-black/6 dark:border-white/6 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-black/25 dark:text-white/25">Close menu</span>
            <kbd className="text-[10px] text-black/25 dark:text-white/25 rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5">esc</kbd>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function MenuBtn({ onClick, destructive, dim, children }: { onClick: () => void; destructive?: boolean; dim?: boolean; children: React.ReactNode }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${destructive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : dim ? "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5" : "text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"}`}>
      {children}
    </button>
  );
}
