"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Type,
  Palette,
} from "lucide-react";

/* ── Constants ── */

const COLORS = [
  { name: "Default", value: "" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Brown", value: "#a87652" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
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

/* ── Component ──
 * Rendered in the document page scroll container (NOT inside the editor).
 * Positioned in the left margin of the centered content area.
 */
export function BlockHandle({
  editor,
  scrollContainer,
}: {
  editor: Editor;
  scrollContainer: HTMLElement;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentBlock = useRef<HTMLElement | null>(null);
  const menuBlockEl = useRef<HTMLElement | null>(null);
  const menuOpenRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSub, setMenuSub] = useState<"main" | "turnInto" | "color">("main");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [selectedNode, setSelectedNode] = useState<HTMLElement | null>(null);

  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  /* ── Position helpers ── */

  const getHandlePosition = useCallback((blockEl: HTMLElement) => {
    const scrollRect = scrollContainer.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const proseMirror = editor.view.dom;
    const pmRect = proseMirror.getBoundingClientRect();

    return {
      top: blockRect.top - scrollRect.top + scrollContainer.scrollTop,
      left: pmRect.left - scrollRect.left - 52, // 52px to the left of editor content
    };
  }, [editor, scrollContainer]);

  const hideHandle = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.style.opacity = "0";
      handleRef.current.style.pointerEvents = "none";
    }
    if (currentBlock.current) {
      currentBlock.current.classList.remove("block-hover-active");
      currentBlock.current = null;
    }
  }, []);

  const showHandle = useCallback((blockEl: HTMLElement) => {
    if (!handleRef.current) return;

    // Swap highlight
    if (currentBlock.current && currentBlock.current !== blockEl) {
      currentBlock.current.classList.remove("block-hover-active");
    }
    blockEl.classList.add("block-hover-active");
    currentBlock.current = blockEl;

    const pos = getHandlePosition(blockEl);
    handleRef.current.style.top = `${pos.top}px`;
    handleRef.current.style.left = `${pos.left}px`;
    handleRef.current.style.opacity = "1";
    handleRef.current.style.pointerEvents = "auto";
  }, [getHandlePosition]);

  /* ── Hover detection: mousemove on scroll container ── */

  useEffect(() => {
    const proseMirror = editor.view.dom;

    const findBlockAtY = (clientY: number): HTMLElement | null => {
      const children = proseMirror.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          return child;
        }
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (menuOpenRef.current) return;

      // Check if mouse is in the content area (horizontally)
      const pmRect = proseMirror.getBoundingClientRect();
      if (
        e.clientX < pmRect.left - 60 ||
        e.clientX > pmRect.right + 10 ||
        e.clientY < pmRect.top ||
        e.clientY > pmRect.bottom
      ) {
        hideHandle();
        return;
      }

      const found = findBlockAtY(e.clientY);
      if (!found) {
        hideHandle();
        return;
      }

      if (currentBlock.current === found) return; // Same block, skip

      showHandle(found);
    };

    const onMouseLeave = () => {
      if (!menuOpenRef.current) hideHandle();
    };

    scrollContainer.addEventListener("mousemove", onMouseMove);
    scrollContainer.addEventListener("mouseleave", onMouseLeave);

    return () => {
      scrollContainer.removeEventListener("mousemove", onMouseMove);
      scrollContainer.removeEventListener("mouseleave", onMouseLeave);
      currentBlock.current?.classList.remove("block-hover-active");
      currentBlock.current = null;
    };
  }, [editor, scrollContainer, hideHandle, showHandle]);

  /* ── Close menu on outside click ── */

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || handleRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  /* ── Clear selection on editor interaction ── */

  useEffect(() => {
    const onUpdate = () => {
      if (selectedNode && !menuOpenRef.current) {
        selectedNode.classList.remove("block-selected");
        setSelectedNode(null);
      }
    };
    editor.on("selectionUpdate", onUpdate);
    return () => { editor.off("selectionUpdate", onUpdate); };
  }, [editor, selectedNode]);

  /* ── Resolve ProseMirror position from DOM ── */

  const resolveBlockPos = useCallback((node: HTMLElement): number | null => {
    try {
      const pos = editor.view.posAtDOM(node, 0);
      const resolved = editor.state.doc.resolve(pos);
      return resolved.before(1);
    } catch { return null; }
  }, [editor]);

  /* ── Actions ── */

  const getBlock = useCallback((): { node: HTMLElement; pos: number } | null => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return null;
    const pos = resolveBlockPos(node);
    if (pos === null) return null;
    return { node, pos };
  }, [resolveBlockPos]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuSub("main");
    selectedNode?.classList.remove("block-selected");
    setSelectedNode(null);
    menuBlockEl.current = null;
  }, [selectedNode]);

  const handleAddBlock = useCallback(() => {
    const node = currentBlock.current;
    if (!node) return;
    const pos = resolveBlockPos(node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    const endPos = pos + pmNode.nodeSize;
    editor.chain().focus().insertContentAt(endPos, { type: "paragraph" }).setTextSelection(endPos + 1).run();
  }, [editor, resolveBlockPos]);

  const handleGripClick = useCallback(() => {
    const node = currentBlock.current;
    if (!node) return;
    const pos = resolveBlockPos(node);
    if (pos === null) return;

    selectedNode?.classList.remove("block-selected");
    node.classList.add("block-selected");
    setSelectedNode(node);

    try {
      const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos));
      editor.view.dispatch(tr);
    } catch {}

    menuBlockEl.current = node;
    const handlePos = getHandlePosition(node);
    setMenuPos({ top: handlePos.top + 28, left: handlePos.left });
    setMenuOpen(true);
    setMenuSub("main");
  }, [editor, resolveBlockPos, selectedNode, getHandlePosition]);

  const handleDelete = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const pmNode = editor.state.doc.nodeAt(block.pos);
    if (!pmNode) return;
    editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + pmNode.nodeSize }).run();
    hideHandle();
    closeMenu();
  }, [editor, getBlock, hideHandle, closeMenu]);

  const handleDuplicate = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const pmNode = editor.state.doc.nodeAt(block.pos);
    if (!pmNode) return;
    editor.chain().focus().insertContentAt(block.pos + pmNode.nodeSize, pmNode.toJSON()).run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleMoveUp = useCallback(() => {
    const block = getBlock();
    if (!block || block.pos === 0) return;
    const pmNode = editor.state.doc.nodeAt(block.pos);
    if (!pmNode) return;
    const $prev = editor.state.doc.resolve(block.pos - 1);
    const prevStart = $prev.before(1);
    editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + pmNode.nodeSize }).insertContentAt(prevStart, pmNode.toJSON()).run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleMoveDown = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const pmNode = editor.state.doc.nodeAt(block.pos);
    if (!pmNode) return;
    const blockEnd = block.pos + pmNode.nodeSize;
    if (blockEnd >= editor.state.doc.content.size) return;
    const nextNode = editor.state.doc.nodeAt(blockEnd);
    if (!nextNode) return;
    editor.chain().focus().deleteRange({ from: block.pos, to: blockEnd }).insertContentAt(block.pos + nextNode.nodeSize, pmNode.toJSON()).run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleTurnInto = useCallback((type: string) => {
    const block = getBlock();
    if (!block) return;
    editor.chain().focus().setTextSelection(block.pos + 1).run();
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
  }, [editor, getBlock, closeMenu]);

  const handleColor = useCallback((color: string) => {
    const block = getBlock();
    if (!block) return;
    const pmNode = editor.state.doc.nodeAt(block.pos);
    if (!pmNode) return;
    editor.chain().focus().setTextSelection({ from: block.pos + 1, to: block.pos + pmNode.nodeSize - 1 }).setColor(color).run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  /* ── Render ── */

  return (
    <>
      {/* Handle in page margin — always mounted, visibility via style */}
      <div
        ref={handleRef}
        className="absolute z-30 flex items-center gap-0.5"
        style={{ top: 0, left: 0, opacity: 0, pointerEvents: "none", transition: "opacity 0.15s ease" }}
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddBlock(); }}
          className="flex h-6 w-6 items-center justify-center rounded text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); handleGripClick(); }}
          className="flex h-6 w-6 items-center justify-center rounded text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors cursor-grab"
          title="Click for block menu"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block action menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up py-1 w-48"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {menuSub === "turnInto" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")}>← Back</MenuBtn>
              {TURN_INTO.map((item) => (
                <MenuBtn key={item.type} onClick={() => handleTurnInto(item.type)}>
                  <item.icon className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  {item.label}
                </MenuBtn>
              ))}
            </>
          ) : menuSub === "color" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")}>← Back</MenuBtn>
              <div className="px-3 py-2 grid grid-cols-5 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleColor(c.value)}
                    title={c.name}
                    className="h-6 w-6 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: c.value || undefined,
                      ...(c.value === "" ? { background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" } : {}),
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <MenuBtn onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </MenuBtn>
              <MenuBtn onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Duplicate
              </MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={() => setMenuSub("turnInto")}>
                <Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Turn into
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </MenuBtn>
              <MenuBtn onClick={() => setMenuSub("color")}>
                <Palette className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Color
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={handleMoveUp}>
                <ArrowUp className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Move up
              </MenuBtn>
              <MenuBtn onClick={handleMoveDown}>
                <ArrowDown className="h-3.5 w-3.5 text-black/40 dark:text-white/40" /> Move down
              </MenuBtn>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MenuBtn({ onClick, className, children }: { onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${className ?? "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"}`}
    >
      {children}
    </button>
  );
}
