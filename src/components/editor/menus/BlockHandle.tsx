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

/* ── Component ── */

export function BlockHandle({
  editor,
  scrollContainer,
}: {
  editor: Editor;
  scrollContainer: HTMLElement;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropIndicatorRef = useRef<HTMLDivElement>(null);
  const currentBlock = useRef<HTMLElement | null>(null);
  const menuBlockEl = useRef<HTMLElement | null>(null);
  const menuOpenRef = useRef(false);
  const dragData = useRef<{ nodeJson: any; sourceEl: HTMLElement } | null>(null);
  const dropTarget = useRef<{ el: HTMLElement; position: "before" | "after" } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSub, setMenuSub] = useState<"main" | "turnInto" | "color">("main");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [selectedNode, setSelectedNode] = useState<HTMLElement | null>(null);

  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  /* ── Position helpers ── */

  const positionHandle = useCallback((blockEl: HTMLElement) => {
    if (!handleRef.current) return;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const pmRect = editor.view.dom.getBoundingClientRect();
    handleRef.current.style.top = `${blockRect.top - scrollRect.top + scrollContainer.scrollTop}px`;
    handleRef.current.style.left = `${pmRect.left - scrollRect.left - 58}px`;
  }, [editor, scrollContainer]);

  const showHandle = useCallback((blockEl: HTMLElement) => {
    if (!handleRef.current) return;
    if (currentBlock.current && currentBlock.current !== blockEl) {
      currentBlock.current.classList.remove("block-hover-active");
    }
    blockEl.classList.add("block-hover-active");
    currentBlock.current = blockEl;
    positionHandle(blockEl);
    handleRef.current.style.opacity = "1";
    handleRef.current.style.pointerEvents = "auto";
  }, [positionHandle]);

  const hideHandle = useCallback(() => {
    if (!handleRef.current) return;
    handleRef.current.style.opacity = "0";
    handleRef.current.style.pointerEvents = "none";
    if (currentBlock.current) {
      currentBlock.current.classList.remove("block-hover-active");
      currentBlock.current = null;
    }
  }, []);

  /* ── Hover: mouseover delegation on .ProseMirror ── */

  useEffect(() => {
    const pm = editor.view.dom;
    const findDirectChild = (target: HTMLElement): HTMLElement | null => {
      let el: HTMLElement | null = target;
      while (el && el.parentElement !== pm) el = el.parentElement;
      return el;
    };

    const onMouseOver = (e: MouseEvent) => {
      if (menuOpenRef.current || dragData.current) return;
      const target = e.target as HTMLElement;
      if (target === pm) return;
      const block = findDirectChild(target);
      if (!block || currentBlock.current === block) return;
      showHandle(block);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (menuOpenRef.current || dragData.current) return;
      const related = e.relatedTarget as Node | null;
      if (related && handleRef.current?.contains(related)) return;
      if (related && menuRef.current?.contains(related)) return;
      hideHandle();
    };

    pm.addEventListener("mouseover", onMouseOver);
    pm.addEventListener("mouseleave", onMouseLeave);
    return () => {
      pm.removeEventListener("mouseover", onMouseOver);
      pm.removeEventListener("mouseleave", onMouseLeave);
      currentBlock.current?.classList.remove("block-hover-active");
      currentBlock.current = null;
    };
  }, [editor, showHandle, hideHandle]);

  /* ── Drag and drop ── */

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const block = currentBlock.current;
    if (!block) return;
    const pos = resolveBlockPos(block);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;

    dragData.current = { nodeJson: pmNode.toJSON(), sourceEl: block };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-block-drag", "1");
    e.dataTransfer.setDragImage(block, 20, 20);
    block.style.opacity = "0.3";
    block.classList.add("block-dragging");
  }, [editor]);

  const handleDragEnd = useCallback(() => {
    if (dragData.current) {
      dragData.current.sourceEl.style.opacity = "";
      dragData.current.sourceEl.classList.remove("block-dragging");
      dragData.current = null;
    }
    dropTarget.current = null;
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
  }, []);

  // Drag over + drop listeners on scroll container
  useEffect(() => {
    const pm = editor.view.dom;

    const onDragOver = (e: DragEvent) => {
      if (!dragData.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      // Find which block the cursor is over and show indicator
      const children = pm.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          // Don't show indicator on the source block
          if (child === dragData.current.sourceEl) {
            if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
            dropTarget.current = null;
            return;
          }

          const midY = rect.top + rect.height / 2;
          const position = e.clientY < midY ? "before" : "after";
          const indicatorY = position === "before" ? rect.top : rect.bottom;

          if (dropIndicatorRef.current) {
            const scrollRect = scrollContainer.getBoundingClientRect();
            dropIndicatorRef.current.style.display = "block";
            dropIndicatorRef.current.style.top = `${indicatorY - scrollRect.top + scrollContainer.scrollTop - 1}px`;
            dropIndicatorRef.current.style.left = `${rect.left - scrollRect.left}px`;
            dropIndicatorRef.current.style.width = `${rect.width}px`;
          }
          dropTarget.current = { el: child, position };
          return;
        }
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!dragData.current || !dropTarget.current) return;
      e.preventDefault();
      e.stopPropagation();

      const { nodeJson, sourceEl } = dragData.current;
      const { el: targetEl, position } = dropTarget.current;

      // Resolve fresh positions at drop time
      const sourcePos = resolveBlockPos(sourceEl);
      const targetPos = resolveBlockPos(targetEl);

      if (sourcePos === null || targetPos === null) {
        handleDragEnd();
        return;
      }

      const sourceNode = editor.state.doc.nodeAt(sourcePos);
      const targetNode = editor.state.doc.nodeAt(targetPos);
      if (!sourceNode || !targetNode) {
        handleDragEnd();
        return;
      }

      const sourceSize = sourceNode.nodeSize;
      const targetSize = targetNode.nodeSize;

      // Calculate insertion point
      const insertAt = position === "before" ? targetPos : targetPos + targetSize;

      // Execute: delete source, insert at target (adjust for position shift)
      if (insertAt <= sourcePos) {
        // Moving up: delete source (higher pos), insert at target
        editor.chain().focus()
          .deleteRange({ from: sourcePos, to: sourcePos + sourceSize })
          .insertContentAt(insertAt, nodeJson)
          .run();
      } else {
        // Moving down: delete source first, target shifts
        editor.chain().focus()
          .deleteRange({ from: sourcePos, to: sourcePos + sourceSize })
          .insertContentAt(insertAt - sourceSize, nodeJson)
          .run();
      }

      // Cleanup
      sourceEl.style.opacity = "";
      sourceEl.classList.remove("block-dragging");
      dragData.current = null;
      dropTarget.current = null;
      if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
      hideHandle();
    };

    const onDragLeave = (e: DragEvent) => {
      // Hide indicator when dragging outside the editor
      if (!dragData.current) return;
      const related = e.relatedTarget as Node | null;
      if (related && pm.contains(related)) return;
      if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
      dropTarget.current = null;
    };

    scrollContainer.addEventListener("dragover", onDragOver);
    scrollContainer.addEventListener("drop", onDrop);
    scrollContainer.addEventListener("dragleave", onDragLeave);
    return () => {
      scrollContainer.removeEventListener("dragover", onDragOver);
      scrollContainer.removeEventListener("drop", onDrop);
      scrollContainer.removeEventListener("dragleave", onDragLeave);
    };
  }, [editor, scrollContainer, hideHandle, handleDragEnd]);

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
      return editor.state.doc.resolve(pos).before(1);
    } catch { return null; }
  }, [editor]);

  const getBlock = useCallback((): { node: HTMLElement; pos: number } | null => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return null;
    const pos = resolveBlockPos(node);
    if (pos === null) return null;
    return { node, pos };
  }, [resolveBlockPos]);

  /* ── Menu actions ── */

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

  const handleGripMenu = useCallback(() => {
    const node = currentBlock.current;
    if (!node) return;
    const pos = resolveBlockPos(node);
    if (pos === null) return;

    selectedNode?.classList.remove("block-selected");
    node.classList.add("block-selected");
    setSelectedNode(node);

    try {
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
    } catch {}

    menuBlockEl.current = node;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const blockRect = node.getBoundingClientRect();
    const pmRect = editor.view.dom.getBoundingClientRect();
    setMenuPos({
      top: blockRect.top - scrollRect.top + scrollContainer.scrollTop + 32,
      left: pmRect.left - scrollRect.left - 58,
    });
    setMenuOpen(true);
    setMenuSub("main");
  }, [editor, scrollContainer, resolveBlockPos, selectedNode]);

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
    const prevStart = editor.state.doc.resolve(block.pos - 1).before(1);
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
      {/* Gold drop indicator line — shown during drag */}
      <div
        ref={dropIndicatorRef}
        className="absolute z-40 h-[3px] rounded-full pointer-events-none"
        style={{ display: "none", backgroundColor: "#d4af37" }}
      />

      {/* Handle — always mounted, positioned in page margin */}
      <div
        ref={handleRef}
        className="absolute z-30 flex items-center gap-1"
        style={{ top: 0, left: 0, opacity: 0, pointerEvents: "none", transition: "opacity 0.12s ease" }}
        onMouseEnter={() => {
          if (handleRef.current && currentBlock.current) {
            handleRef.current.style.opacity = "1";
            handleRef.current.style.pointerEvents = "auto";
          }
        }}
        onMouseLeave={(e) => {
          if (menuOpenRef.current || dragData.current) return;
          const related = e.relatedTarget as Node | null;
          if (related && editor.view.dom.contains(related)) return;
          if (related && menuRef.current?.contains(related)) return;
          hideHandle();
        }}
      >
        {/* + Add block */}
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddBlock(); }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
          title="Add block below"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* ⠿ Drag handle — left-click drags, right-click opens menu */}
        <button
          draggable
          onDragStart={handleDragStart as any}
          onDragEnd={handleDragEnd}
          onContextMenu={(e) => { e.preventDefault(); handleGripMenu(); }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move · Right-click for menu"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Block action menu (right-click) */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl py-1.5 w-52"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseEnter={() => {
            if (handleRef.current) {
              handleRef.current.style.opacity = "1";
              handleRef.current.style.pointerEvents = "auto";
            }
          }}
        >
          {menuSub === "turnInto" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")} dim>← Back</MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              {TURN_INTO.map((item) => (
                <MenuBtn key={item.type} onClick={() => handleTurnInto(item.type)}>
                  <item.icon className="h-4 w-4 text-black/40 dark:text-white/40" />
                  {item.label}
                </MenuBtn>
              ))}
            </>
          ) : menuSub === "color" ? (
            <>
              <MenuBtn onClick={() => setMenuSub("main")} dim>← Back</MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <div className="px-3 py-2.5 grid grid-cols-5 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleColor(c.value)}
                    title={c.name}
                    className="h-7 w-7 rounded-full border-2 border-black/10 dark:border-white/10 hover:scale-110 hover:border-black/25 dark:hover:border-white/25 transition-all"
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
              <MenuBtn onClick={handleDelete} destructive>
                <Trash2 className="h-4 w-4" /> Delete
              </MenuBtn>
              <MenuBtn onClick={handleDuplicate}>
                <Copy className="h-4 w-4 text-black/40 dark:text-white/40" /> Duplicate
              </MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={() => setMenuSub("turnInto")}>
                <Type className="h-4 w-4 text-black/40 dark:text-white/40" /> Turn into
                <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span>
              </MenuBtn>
              <MenuBtn onClick={() => setMenuSub("color")}>
                <Palette className="h-4 w-4 text-black/40 dark:text-white/40" /> Color
                <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">→</span>
              </MenuBtn>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuBtn onClick={handleMoveUp}>
                <ArrowUp className="h-4 w-4 text-black/40 dark:text-white/40" /> Move up
                <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘⇧↑</span>
              </MenuBtn>
              <MenuBtn onClick={handleMoveDown}>
                <ArrowDown className="h-4 w-4 text-black/40 dark:text-white/40" /> Move down
                <span className="ml-auto text-[10px] text-black/25 dark:text-white/25">⌘⇧↓</span>
              </MenuBtn>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MenuBtn({ onClick, destructive, dim, children }: { onClick: () => void; destructive?: boolean; dim?: boolean; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
        destructive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          : dim ? "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
            : "text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
