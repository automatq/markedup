"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import {
  GripVertical, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Type, Palette, Table, ChevronRight, Info,
  ImageIcon, Minus, Highlighter, type LucideIcon,
} from "lucide-react";
import { filterSlashCommands, type SlashCommandItem } from "./slash-command";

/* ── Constants ── */

const COLORS = [
  { name: "Default", value: "" }, { name: "Gray", value: "#9ca3af" },
  { name: "Brown", value: "#a87652" }, { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" }, { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" }, { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" }, { name: "Pink", value: "#ec4899" },
];

const TURN_INTO = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "h1", label: "Heading 1", icon: Heading1 },
  { type: "h2", label: "Heading 2", icon: Heading2 },
  { type: "h3", label: "Heading 3", icon: Heading3 },
  { type: "bulletList", label: "Bullet List", icon: List },
  { type: "orderedList", label: "Numbered List", icon: ListOrdered },
  { type: "taskList", label: "To-do List", icon: CheckSquare },
  { type: "blockquote", label: "Quote", icon: Quote },
  { type: "codeBlock", label: "Code", icon: Code },
];

const BLOCK_ICON_MAP: Record<string, LucideIcon> = {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, CheckSquare,
  Table, ChevronRight, Highlighter, Code, Info, ImageIcon, Minus,
};

/* ── Helper: find block pos by walking doc nodes ── */

function findBlockPos(editor: Editor, node: PmNode | null): number | null {
  if (!node) return null;
  let pos = 0;
  for (let i = 0; i < editor.state.doc.childCount; i++) {
    const child = editor.state.doc.child(i);
    if (child === node) return pos;
    pos += child.nodeSize;
  }
  return null;
}

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

  const executeBlockCommand = useCallback((item: SlashCommandItem) => {
    if (activePos < 0 || !activeNode) return;
    const title = item.title.toLowerCase();

    editor.chain().focus().setTextSelection(activePos + 1).run();

    if (title.includes("heading 1")) editor.chain().focus().setHeading({ level: 1 }).run();
    else if (title.includes("heading 2")) editor.chain().focus().setHeading({ level: 2 }).run();
    else if (title.includes("heading 3")) editor.chain().focus().setHeading({ level: 3 }).run();
    else if (title.includes("bullet")) editor.chain().focus().toggleBulletList().run();
    else if (title.includes("numbered")) editor.chain().focus().toggleOrderedList().run();
    else if (title.includes("to-do")) editor.chain().focus().toggleTaskList().run();
    else if (title.includes("blockquote")) editor.chain().focus().toggleBlockquote().run();
    else if (title.includes("code")) editor.chain().focus().toggleCodeBlock().run();
    else if (title.includes("highlight")) editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run();
    else {
      const isEmpty = activeNode.textContent.trim() === "";
      const endPos = activePos + activeNode.nodeSize;

      if (title.includes("table")) {
        if (isEmpty) editor.chain().focus().deleteRange({ from: activePos, to: endPos }).run();
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      } else if (title.includes("toggle")) {
        if (isEmpty) editor.chain().focus().deleteRange({ from: activePos, to: endPos }).run();
        editor.chain().focus().insertContentAt(isEmpty ? activePos : endPos, { type: "toggle", attrs: { open: true }, content: [{ type: "paragraph" }] }).run();
      } else if (title.includes("callout")) {
        if (isEmpty) editor.chain().focus().deleteRange({ from: activePos, to: endPos }).run();
        editor.chain().focus().insertContentAt(isEmpty ? activePos : endPos, { type: "callout", content: [{ type: "paragraph" }] }).run();
      } else if (title.includes("divider")) {
        if (isEmpty) editor.chain().focus().deleteRange({ from: activePos, to: endPos }).run();
        editor.chain().focus().insertContentAt(isEmpty ? activePos : endPos, { type: "horizontalRule" }).run();
      } else if (title.includes("image")) {
        const url = window.prompt("Image URL:");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }
    }

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
    editor.chain().focus().setTextSelection(activePos + 1).run();
    switch (type) {
      case "paragraph": editor.chain().focus().setParagraph().run(); break;
      case "h1": editor.chain().focus().setHeading({ level: 1 }).run(); break;
      case "h2": editor.chain().focus().setHeading({ level: 2 }).run(); break;
      case "h3": editor.chain().focus().setHeading({ level: 3 }).run(); break;
      case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
      case "orderedList": editor.chain().focus().toggleOrderedList().run(); break;
      case "taskList": editor.chain().focus().toggleTaskList().run(); break;
      case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
      case "codeBlock": editor.chain().focus().toggleCodeBlock().run(); break;
    }
    closeMenu();
  }, [editor, activePos, closeMenu]);

  const handleColor = useCallback((color: string) => {
    if (activePos < 0 || !activeNode) return;
    editor.chain().focus().setTextSelection({ from: activePos + 1, to: activePos + activeNode.nodeSize - 1 }).setColor(color).run();
    closeMenu();
  }, [editor, activeNode, activePos, closeMenu]);

  /* ── Render ── */

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

      {/* Right-click menu — fixed position at click coordinates */}
      {menuOpen && (
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
        </div>
      )}

      {/* Block picker */}
      {pickerOpen && (
        <div ref={pickerRef} className="fixed z-[100] w-72 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl animate-fade-in-up overflow-hidden"
          style={{
            left: Math.min(pickerClickPos.x, window.innerWidth - 300),
            top: Math.min(pickerClickPos.y + 10, window.innerHeight - 400),
          }}>
          <div className="px-3 pt-3 pb-2">
            <input ref={pickerInputRef} type="text" value={pickerQuery} onChange={(e) => { setPickerQuery(e.target.value); setPickerIndex(0); }}
              onKeyDown={(e) => {
                const items = filterSlashCommands(pickerQuery);
                if (e.key === "ArrowDown") { e.preventDefault(); setPickerIndex((pickerIndex + 1) % Math.max(items.length, 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setPickerIndex((pickerIndex + items.length - 1) % Math.max(items.length, 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (items[pickerIndex]) executeBlockCommand(items[pickerIndex]); }
                else if (e.key === "Escape") { e.preventDefault(); setPickerOpen(false); setPickerQuery(""); }
              }}
              placeholder="Type to filter..." className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.04] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-colors" />
          </div>
          <div className="max-h-[320px] overflow-y-auto px-1.5 pb-1.5">
            <p className="px-2 pt-1 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">Basic blocks</p>
            {(() => {
              const items = filterSlashCommands(pickerQuery);
              if (items.length === 0) return <p className="px-3 py-4 text-xs text-black/30 dark:text-white/30 text-center">No blocks found</p>;
              return items.map((item, index) => {
                const Icon = BLOCK_ICON_MAP[item.icon];
                return (
                  <button key={item.title} onMouseDown={(e) => e.preventDefault()} onClick={() => executeBlockCommand(item)} onMouseEnter={() => setPickerIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${index === pickerIndex ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white" : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"}`}>
                    {Icon && <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${index === pickerIndex ? "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white" : "bg-black/[0.04] text-black/35 dark:bg-white/[0.04] dark:text-white/35"}`}><Icon className="h-4 w-4" /></div>}
                    <div><p className="text-[13px] font-medium">{item.title}</p><p className="text-[10px] text-black/40 dark:text-white/40">{item.description}</p></div>
                  </button>
                );
              });
            })()}
          </div>
          <div className="border-t border-black/6 dark:border-white/6 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-black/25 dark:text-white/25">Close menu</span>
            <kbd className="text-[10px] text-black/25 dark:text-white/25 rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5">esc</kbd>
          </div>
        </div>
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
