"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
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

/* ── Helpers ── */

/** Walk top-level doc nodes and match by DOM element. Most reliable approach. */
function findBlockPos(editor: Editor, node: HTMLElement): number | null {
  try {
    let docPos = 0;
    for (let i = 0; i < editor.state.doc.childCount; i++) {
      const child = editor.state.doc.child(i);
      const domNode = editor.view.nodeDOM(docPos);
      if (domNode === node || (domNode instanceof HTMLElement && domNode.contains(node))) return docPos;
      docPos += child.nodeSize;
    }
    return null;
  } catch { return null; }
}

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerIndex, setPickerIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { menuOpenRef.current = menuOpen || pickerOpen; }, [menuOpen, pickerOpen]);

  /* ── Position helpers ── */

  const getHandleLeft = useCallback(() => {
    const scrollRect = scrollContainer.getBoundingClientRect();
    const pmRect = editor.view.dom.getBoundingClientRect();
    return Math.max(4, pmRect.left - scrollRect.left - 58);
  }, [editor, scrollContainer]);

  const positionHandle = useCallback((blockEl: HTMLElement) => {
    if (!handleRef.current) return;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    handleRef.current.style.top = `${blockRect.top - scrollRect.top + scrollContainer.scrollTop}px`;
    handleRef.current.style.left = `${getHandleLeft()}px`;
  }, [scrollContainer, getHandleLeft]);

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

    const findNearestBlockAtY = (clientY: number): HTMLElement | null => {
      const children = pm.children;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        // Direct hit
        if (clientY >= rect.top && clientY <= rect.bottom) return child;
        // Nearest by distance
        const dist = Math.min(Math.abs(clientY - rect.top), Math.abs(clientY - rect.bottom));
        if (dist < closestDist) { closestDist = dist; closest = child; }
      }
      return closestDist < 40 ? closest : null; // Within 40px of nearest block
    };

    const onMouseOver = (e: MouseEvent) => {
      if (menuOpenRef.current || dragData.current) return;
      const target = e.target as HTMLElement;

      let block: HTMLElement | null;
      if (target === pm) {
        // Hovering blank space — find nearest block by Y coordinate
        block = findNearestBlockAtY(e.clientY);
      } else {
        block = findDirectChild(target);
      }

      if (!block || currentBlock.current === block) return;
      showHandle(block);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (menuOpenRef.current || dragData.current) return;
      const related = e.relatedTarget as Node | null;
      if (related && handleRef.current?.contains(related)) return;
      if (related && menuRef.current?.contains(related)) return;
      if (related && pickerRef.current?.contains(related)) return; // Bug 6 fix
      hideHandle();
    };

    // mousemove on blank space (when target is pm itself) to track nearest block
    const onMouseMove = (e: MouseEvent) => {
      if (menuOpenRef.current || dragData.current) return;
      if (e.target !== pm) return; // Only for blank space — mouseover handles block elements
      const block = findNearestBlockAtY(e.clientY);
      if (!block || currentBlock.current === block) return;
      showHandle(block);
    };

    pm.addEventListener("mouseover", onMouseOver);
    pm.addEventListener("mousemove", onMouseMove);
    pm.addEventListener("mouseleave", onMouseLeave);
    return () => {
      pm.removeEventListener("mouseover", onMouseOver);
      pm.removeEventListener("mousemove", onMouseMove);
      pm.removeEventListener("mouseleave", onMouseLeave);
      currentBlock.current?.classList.remove("block-hover-active");
      currentBlock.current = null;
    };
  }, [editor, showHandle, hideHandle]);

  /* ── Drag and drop ── */

  const cleanupDrag = useCallback(() => {
    if (dragData.current) {
      const el = dragData.current.sourceEl;
      if (el.isConnected) { // Bug 4 fix
        el.style.opacity = "";
        el.classList.remove("block-dragging");
      }
      dragData.current = null;
    }
    dropTarget.current = null;
    if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const block = currentBlock.current;
    if (!block) return;
    const pos = findBlockPos(editor, block);
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

  useEffect(() => {
    const pm = editor.view.dom;

    const onDragOver = (e: DragEvent) => {
      if (!dragData.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      const children = pm.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const rect = child.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
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

    // Bug 3 fix: separate delete + fresh resolve + insert
    const onDrop = (e: DragEvent) => {
      if (!dragData.current || !dropTarget.current) return;
      e.preventDefault();
      e.stopPropagation();

      const { nodeJson } = dragData.current;
      const { el: targetEl, position } = dropTarget.current;

      // Step 1: Find and delete source block
      const sourcePos = findBlockPos(editor, dragData.current.sourceEl);
      if (sourcePos === null) { cleanupDrag(); return; }
      const sourceNode = editor.state.doc.nodeAt(sourcePos);
      if (!sourceNode) { cleanupDrag(); return; }

      // Check: is target before or after source?
      const targetPosBefore = findBlockPos(editor, targetEl);
      if (targetPosBefore === null) { cleanupDrag(); return; }
      const movingUp = targetPosBefore < sourcePos;

      // Step 2: Delete source
      editor.chain().focus().deleteRange({ from: sourcePos, to: sourcePos + sourceNode.nodeSize }).run();

      // Step 3: Re-resolve target position FRESH after deletion
      const targetPosAfter = findBlockPos(editor, targetEl);
      if (targetPosAfter === null) {
        // Target element was removed (shouldn't happen) — just insert at end
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, nodeJson).run();
        cleanupDrag();
        hideHandle();
        return;
      }

      const targetNodeAfter = editor.state.doc.nodeAt(targetPosAfter);
      const targetSize = targetNodeAfter?.nodeSize ?? 0;
      const insertAt = position === "before" ? targetPosAfter : targetPosAfter + targetSize;

      // Step 4: Insert at fresh position
      editor.chain().focus().insertContentAt(insertAt, nodeJson).run();

      cleanupDrag();
      hideHandle();
    };

    const onDragLeave = (e: DragEvent) => {
      if (!dragData.current) return;
      const related = e.relatedTarget as Node | null;
      if (related && pm.contains(related)) return;
      if (dropIndicatorRef.current) dropIndicatorRef.current.style.display = "none";
      dropTarget.current = null;
    };

    // Bug 10 fix: cleanup drag state if PM intercepts the drop
    const onPmDrop = (e: DragEvent) => {
      if (dragData.current) {
        e.preventDefault();
        e.stopPropagation();
        cleanupDrag();
      }
    };

    scrollContainer.addEventListener("dragover", onDragOver);
    scrollContainer.addEventListener("drop", onDrop);
    scrollContainer.addEventListener("dragleave", onDragLeave);
    pm.addEventListener("drop", onPmDrop, true);
    return () => {
      scrollContainer.removeEventListener("dragover", onDragOver);
      scrollContainer.removeEventListener("drop", onDrop);
      scrollContainer.removeEventListener("dragleave", onDragLeave);
      pm.removeEventListener("drop", onPmDrop, true);
    };
  }, [editor, scrollContainer, hideHandle, cleanupDrag]);

  /* ── Close menu/picker on outside click ── */

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuSub("main");
    selectedNode?.classList.remove("block-selected");
    setSelectedNode(null);
    menuBlockEl.current = null;
  }, [selectedNode]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setPickerQuery("");
    menuBlockEl.current = null;
  }, []);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || handleRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      if (menuOpen) closeMenu(); // Bug 5 fix: closeMenu in deps
      if (pickerOpen) closePicker();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen, pickerOpen, closeMenu, closePicker]); // Bug 5 fix

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

  /* ── Actions ── */

  const handleAddBlock = useCallback(() => {
    const node = currentBlock.current;
    if (!node) return;
    menuBlockEl.current = node;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const blockRect = node.getBoundingClientRect();
    setPickerPos({
      top: blockRect.bottom - scrollRect.top + scrollContainer.scrollTop + 4,
      left: getHandleLeft(), // Bug 1 fix: getHandleLeft in deps
    });
    setPickerQuery("");
    setPickerIndex(0);
    setPickerOpen(true);
    setTimeout(() => pickerInputRef.current?.focus(), 50);
  }, [scrollContainer, getHandleLeft]); // Bug 1 fix

  // Bug 7 fix: split insert-based vs convert-based blocks
  const executeBlockCommand = useCallback((item: SlashCommandItem) => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    const endPos = pos + pmNode.nodeSize;
    const title = item.title.toLowerCase();

    // Insert-based blocks: insert directly at endPos (no paragraph first)
    if (title.includes("table")) {
      editor.chain().focus().insertContentAt(endPos, { type: "paragraph" }).setTextSelection(endPos + 1).run();
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    } else if (title.includes("toggle")) {
      editor.chain().focus().insertContentAt(endPos, { type: "toggle", attrs: { open: true }, content: [{ type: "paragraph" }] }).run();
    } else if (title.includes("callout")) {
      editor.chain().focus().insertContentAt(endPos, { type: "callout", content: [{ type: "paragraph" }] }).run();
    } else if (title.includes("divider")) {
      editor.chain().focus().insertContentAt(endPos, { type: "horizontalRule" }).run();
    } else if (title.includes("image")) {
      const url = window.prompt("Image URL:");
      if (url) {
        editor.chain().focus().insertContentAt(endPos, { type: "paragraph" }).setTextSelection(endPos + 1).run();
        editor.chain().focus().setImage({ src: url }).run();
      }
    } else if (title.includes("highlight")) {
      editor.chain().focus().insertContentAt(endPos, { type: "paragraph" }).setTextSelection(endPos + 1).run();
      editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run();
    } else {
      // Convert-based blocks: insert paragraph, then convert
      editor.chain().focus().insertContentAt(endPos, { type: "paragraph" }).setTextSelection(endPos + 1).run();
      if (title.includes("heading 1")) editor.chain().focus().setHeading({ level: 1 }).run();
      else if (title.includes("heading 2")) editor.chain().focus().setHeading({ level: 2 }).run();
      else if (title.includes("heading 3")) editor.chain().focus().setHeading({ level: 3 }).run();
      else if (title.includes("bullet")) editor.chain().focus().toggleBulletList().run();
      else if (title.includes("numbered")) editor.chain().focus().toggleOrderedList().run();
      else if (title.includes("to-do")) editor.chain().focus().toggleTaskList().run();
      else if (title.includes("blockquote")) editor.chain().focus().toggleBlockquote().run();
      else if (title.includes("code")) editor.chain().focus().toggleCodeBlock().run();
    }

    closePicker();
  }, [editor, closePicker]);

  const handleGripMenu = useCallback(() => {
    const node = currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
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
    setMenuPos({
      top: blockRect.top - scrollRect.top + scrollContainer.scrollTop + 32,
      left: getHandleLeft(), // Bug 2 fix
    });
    setMenuOpen(true);
    setMenuSub("main");
  }, [editor, scrollContainer, getHandleLeft, selectedNode]); // Bug 2 fix

  const handleDelete = useCallback(() => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    editor.chain().focus().deleteRange({ from: pos, to: pos + pmNode.nodeSize }).run();
    hideHandle();
    closeMenu();
  }, [editor, hideHandle, closeMenu]);

  const handleDuplicate = useCallback(() => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    editor.chain().focus().insertContentAt(pos + pmNode.nodeSize, pmNode.toJSON()).run();
    closeMenu();
  }, [editor, closeMenu]);

  // Bug 8 fix: use separate delete + fresh resolve for move up/down
  const handleMoveUp = useCallback(() => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null || pos === 0) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    const nodeJson = pmNode.toJSON();

    // Find previous block
    const $prev = editor.state.doc.resolve(pos - 1);
    const prevPos = $prev.before(1);

    // Delete current, then insert at previous position
    editor.chain().focus().deleteRange({ from: pos, to: pos + pmNode.nodeSize }).run();
    editor.chain().focus().insertContentAt(prevPos, nodeJson).run();
    closeMenu();
  }, [editor, closeMenu]);

  const handleMoveDown = useCallback(() => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    const blockEnd = pos + pmNode.nodeSize;
    if (blockEnd >= editor.state.doc.content.size) return;
    const nextNode = editor.state.doc.nodeAt(blockEnd);
    if (!nextNode) return;
    const nodeJson = pmNode.toJSON();

    // Delete current block
    editor.chain().focus().deleteRange({ from: pos, to: blockEnd }).run();

    // After deletion, the next block is now at `pos`. Insert after it.
    const nextNodeNow = editor.state.doc.nodeAt(pos);
    if (!nextNodeNow) return;
    editor.chain().focus().insertContentAt(pos + nextNodeNow.nodeSize, nodeJson).run();
    closeMenu();
  }, [editor, closeMenu]);

  const handleTurnInto = useCallback((type: string) => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    editor.chain().focus().setTextSelection(pos + 1).run();
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
  }, [editor, closeMenu]);

  const handleColor = useCallback((color: string) => {
    const node = menuBlockEl.current || currentBlock.current;
    if (!node) return;
    const pos = findBlockPos(editor, node);
    if (pos === null) return;
    const pmNode = editor.state.doc.nodeAt(pos);
    if (!pmNode) return;
    editor.chain().focus().setTextSelection({ from: pos + 1, to: pos + pmNode.nodeSize - 1 }).setColor(color).run();
    closeMenu();
  }, [editor, closeMenu]);

  /* ── Render ── */

  return (
    <>
      <div
        ref={dropIndicatorRef}
        className="absolute z-40 h-[3px] rounded-full pointer-events-none"
        style={{ display: "none", backgroundColor: "#d4af37" }}
      />

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
          if (related && pickerRef.current?.contains(related)) return; // Bug 6 fix
          hideHandle();
        }}
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleAddBlock(); }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
          title="Add block below"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          draggable
          onDragStart={handleDragStart as any}
          onDragEnd={cleanupDrag}
          onContextMenu={(e) => { e.preventDefault(); handleGripMenu(); }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/35 dark:text-white/35 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move · Right-click for menu"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl py-1.5 w-52"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseEnter={() => { if (handleRef.current) { handleRef.current.style.opacity = "1"; handleRef.current.style.pointerEvents = "auto"; } }}
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

      {pickerOpen && (
        <BlockPicker
          ref={pickerRef} inputRef={pickerInputRef} query={pickerQuery}
          selectedIndex={pickerIndex} position={pickerPos}
          onQueryChange={(q) => { setPickerQuery(q); setPickerIndex(0); }}
          onIndexChange={setPickerIndex} onSelect={executeBlockCommand}
          onClose={closePicker}
        />
      )}
    </>
  );
}

/* ── Block Picker ── */

const BlockPicker = React.forwardRef<HTMLDivElement, {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string; selectedIndex: number;
  position: { top: number; left: number };
  onQueryChange: (q: string) => void; onIndexChange: (i: number) => void;
  onSelect: (item: SlashCommandItem) => void; onClose: () => void;
}>(({ inputRef, query, selectedIndex, position, onQueryChange, onIndexChange, onSelect, onClose }, ref) => {
  const items = filterSlashCommands(query);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); onIndexChange((selectedIndex + 1) % Math.max(items.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); onIndexChange((selectedIndex + items.length - 1) % Math.max(items.length, 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[selectedIndex]) onSelect(items[selectedIndex]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div ref={ref} className="absolute z-50 w-72 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl animate-fade-in-up overflow-hidden" style={{ top: position.top, left: position.left }}>
      <div className="px-3 pt-3 pb-2">
        <input ref={inputRef} type="text" value={query} onChange={(e) => onQueryChange(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Type to filter..." className="w-full rounded-lg bg-black/[0.04] dark:bg-white/[0.04] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-colors" />
      </div>
      <div className="max-h-[320px] overflow-y-auto px-1.5 pb-1.5">
        <p className="px-2 pt-1 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">Basic blocks</p>
        {items.length === 0 ? (
          <p className="px-3 py-4 text-xs text-black/30 dark:text-white/30 text-center">No blocks found</p>
        ) : items.map((item, index) => {
          const Icon = BLOCK_ICON_MAP[item.icon];
          return (
            <button key={item.title} onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(item)} onMouseEnter={() => onIndexChange(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${index === selectedIndex ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white" : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"}`}>
              {Icon && <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${index === selectedIndex ? "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white" : "bg-black/[0.04] text-black/35 dark:bg-white/[0.04] dark:text-white/35"}`}><Icon className="h-4 w-4" /></div>}
              <div><p className="text-[13px] font-medium">{item.title}</p><p className="text-[10px] text-black/40 dark:text-white/40">{item.description}</p></div>
            </button>
          );
        })}
      </div>
      <div className="border-t border-black/6 dark:border-white/6 px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-black/25 dark:text-white/25">Close menu</span>
        <kbd className="text-[10px] text-black/25 dark:text-white/25 rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5">esc</kbd>
      </div>
    </div>
  );
});
BlockPicker.displayName = "BlockPicker";

function MenuBtn({ onClick, destructive, dim, children }: { onClick: () => void; destructive?: boolean; dim?: boolean; children: React.ReactNode }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${destructive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : dim ? "text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5" : "text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5"}`}>
      {children}
    </button>
  );
}
