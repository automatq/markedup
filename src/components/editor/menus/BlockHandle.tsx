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

interface BlockHandleProps {
  editor: Editor;
}

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

export function BlockHandle({ editor }: BlockHandleProps) {
  // Refs for zero-re-render hover tracking
  const handleRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const currentBlock = useRef<{ node: HTMLElement; pos: number } | null>(null);
  const menuBlock = useRef<{ node: HTMLElement; pos: number } | null>(null);
  const rafId = useRef(0);
  const menuOpenRef = useRef(false);
  const dragSource = useRef<{ pos: number; node: HTMLElement } | null>(null);

  // React state only for menu rendering
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSub, setMenuSub] = useState<"main" | "turnInto" | "color">("main");
  const [menuTop, setMenuTop] = useState(0);
  const [selectedNode, setSelectedNode] = useState<HTMLElement | null>(null);

  // Sync menuOpen ref
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  const hideHandle = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.style.opacity = "0";
      handleRef.current.style.pointerEvents = "none";
    }
    if (currentBlock.current) {
      currentBlock.current.node.classList.remove("block-hover-active");
      currentBlock.current = null;
    }
  }, []);

  const showHandle = useCallback((node: HTMLElement, pos: number) => {
    if (!handleRef.current) return;

    // Remove old highlight
    if (currentBlock.current && currentBlock.current.node !== node) {
      currentBlock.current.node.classList.remove("block-hover-active");
    }

    // Add new highlight
    node.classList.add("block-hover-active");
    currentBlock.current = { node, pos };

    // Position using offsetTop — naturally accounts for scroll
    handleRef.current.style.top = `${node.offsetTop}px`;
    handleRef.current.style.opacity = "1";
    handleRef.current.style.pointerEvents = "auto";
  }, []);

  // Core mousemove handler — uses refs + rAF, no React state
  useEffect(() => {
    const wrapper = editor.view.dom.parentElement;
    if (!wrapper) return;

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (menuOpenRef.current) return;

        const editorDom = editor.view.dom;
        const editorRect = editorDom.getBoundingClientRect();

        // Check bounds — generous left margin for handle area
        if (
          e.clientY < editorRect.top ||
          e.clientY > editorRect.bottom ||
          e.clientX < editorRect.left - 60 ||
          e.clientX > editorRect.right + 10
        ) {
          hideHandle();
          return;
        }

        // Resolve position at a consistent x coordinate inside the editor
        const posInfo = editor.view.posAtCoords({
          left: editorRect.left + 50,
          top: e.clientY,
        });
        if (!posInfo) {
          hideHandle();
          return;
        }

        try {
          const resolved = editor.state.doc.resolve(posInfo.pos);
          if (resolved.depth < 1) {
            hideHandle();
            return;
          }

          const blockPos = resolved.before(1);
          const domNode = editor.view.nodeDOM(blockPos);
          if (!(domNode instanceof HTMLElement)) {
            hideHandle();
            return;
          }

          // Same block — no update needed
          if (currentBlock.current?.node === domNode) return;

          showHandle(domNode, blockPos);
        } catch {
          hideHandle();
        }
      });
    };

    const onMouseLeave = (e: MouseEvent) => {
      // Don't hide if mouse moved to the handle/menu
      const relatedTarget = e.relatedTarget as Node | null;
      if (
        relatedTarget &&
        (handleRef.current?.contains(relatedTarget) ||
          menuContainerRef.current?.contains(relatedTarget))
      ) {
        return;
      }
      if (!menuOpenRef.current) {
        cancelAnimationFrame(rafId.current);
        hideHandle();
      }
    };

    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId.current);
      wrapper.removeEventListener("mousemove", onMouseMove);
      wrapper.removeEventListener("mouseleave", onMouseLeave);
      currentBlock.current?.node.classList.remove("block-hover-active");
      currentBlock.current = null;
    };
  }, [editor, hideHandle, showHandle]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuContainerRef.current?.contains(target) ||
        handleRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
      setMenuSub("main");
      selectedNode?.classList.remove("block-selected");
      setSelectedNode(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen, selectedNode]);

  // Clear block selection when typing in editor
  useEffect(() => {
    const onSelectionUpdate = () => {
      if (selectedNode && !menuOpenRef.current) {
        selectedNode.classList.remove("block-selected");
        setSelectedNode(null);
      }
    };
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => { editor.off("selectionUpdate", onSelectionUpdate); };
  }, [editor, selectedNode]);

  // ── Actions ──

  const getBlock = useCallback(() => {
    return menuBlock.current || currentBlock.current;
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuSub("main");
    selectedNode?.classList.remove("block-selected");
    setSelectedNode(null);
    menuBlock.current = null;
  }, [selectedNode]);

  const handleAddBlock = useCallback(() => {
    const block = currentBlock.current;
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    const endPos = block.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(endPos, { type: "paragraph" })
      .setTextSelection(endPos + 1)
      .run();
    // Open slash commands
    setTimeout(() => editor.commands.insertContent("/"), 50);
  }, [editor]);

  const handleGripClick = useCallback(() => {
    const block = currentBlock.current;
    if (!block) return;

    // Visual selection
    selectedNode?.classList.remove("block-selected");
    block.node.classList.add("block-selected");
    setSelectedNode(block.node);

    // ProseMirror selection
    try {
      const tr = editor.state.tr.setSelection(
        NodeSelection.create(editor.state.doc, block.pos)
      );
      editor.view.dispatch(tr);
    } catch {
      // Not all nodes support NodeSelection
    }

    // Anchor menu to this block
    menuBlock.current = { ...block };
    setMenuTop(block.node.offsetTop + 28);
    setMenuOpen(true);
    setMenuSub("main");
  }, [editor, selectedNode]);

  const handleDelete = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + node.nodeSize }).run();
    hideHandle();
    closeMenu();
  }, [editor, getBlock, hideHandle, closeMenu]);

  const handleDuplicate = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    editor.chain().focus().insertContentAt(block.pos + node.nodeSize, node.toJSON()).run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleMoveUp = useCallback(() => {
    const block = getBlock();
    if (!block || block.pos === 0) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    const blockEnd = block.pos + node.nodeSize;
    const $prev = editor.state.doc.resolve(block.pos - 1);
    const prevStart = $prev.before(1);
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: blockEnd })
      .insertContentAt(prevStart, node.toJSON())
      .run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleMoveDown = useCallback(() => {
    const block = getBlock();
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    const blockEnd = block.pos + node.nodeSize;
    if (blockEnd >= editor.state.doc.content.size) return;
    const nextNode = editor.state.doc.nodeAt(blockEnd);
    if (!nextNode) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: blockEnd })
      .insertContentAt(block.pos + nextNode.nodeSize, node.toJSON())
      .run();
    closeMenu();
  }, [editor, getBlock, closeMenu]);

  const handleTurnInto = useCallback(
    (type: string) => {
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
    },
    [editor, getBlock, closeMenu]
  );

  const handleColor = useCallback(
    (color: string) => {
      const block = getBlock();
      if (!block) return;
      const node = editor.state.doc.nodeAt(block.pos);
      if (!node) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: block.pos + 1, to: block.pos + node.nodeSize - 1 })
        .setColor(color)
        .run();
      closeMenu();
    },
    [editor, getBlock, closeMenu]
  );

  // Drag and drop
  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      const block = currentBlock.current;
      if (!block) return;
      dragSource.current = { pos: block.pos, node: block.node };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
      e.dataTransfer.setDragImage(block.node, 0, 0);
      block.node.style.opacity = "0.4";
    },
    []
  );

  const onDragEnd = useCallback(() => {
    if (dragSource.current) {
      dragSource.current.node.style.opacity = "";
      dragSource.current = null;
    }
  }, []);

  useEffect(() => {
    const editorDom = editor.view.dom;
    const onDragOver = (e: DragEvent) => {
      if (!dragSource.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };
    const onDrop = (e: DragEvent) => {
      if (!dragSource.current) return;
      e.preventDefault();
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) return;
      try {
        const resolved = editor.state.doc.resolve(pos.pos);
        if (resolved.depth < 1) return;
        const targetPos = resolved.before(1);
        const sourcePos = dragSource.current.pos;
        const sourceNode = editor.state.doc.nodeAt(sourcePos);
        if (!sourceNode || targetPos === sourcePos) return;
        const sourceSize = sourceNode.nodeSize;
        if (targetPos < sourcePos) {
          editor.chain().focus()
            .deleteRange({ from: sourcePos, to: sourcePos + sourceSize })
            .insertContentAt(targetPos, sourceNode.toJSON())
            .run();
        } else {
          editor.chain().focus()
            .deleteRange({ from: sourcePos, to: sourcePos + sourceSize })
            .insertContentAt(targetPos - sourceSize, sourceNode.toJSON())
            .run();
        }
      } catch {
        // Invalid drop target
      }
      if (dragSource.current) {
        dragSource.current.node.style.opacity = "";
        dragSource.current = null;
      }
    };
    editorDom.addEventListener("dragover", onDragOver);
    editorDom.addEventListener("drop", onDrop);
    return () => {
      editorDom.removeEventListener("dragover", onDragOver);
      editorDom.removeEventListener("drop", onDrop);
    };
  }, [editor]);

  // ── Render ──

  return (
    <>
      {/* Handle — always mounted, visibility controlled via style */}
      <div
        ref={handleRef}
        className="absolute z-30 flex items-center gap-0.5"
        style={{ top: 0, left: 0, opacity: 0, pointerEvents: "none", transition: "opacity 0.1s ease" }}
        onMouseLeave={(e) => {
          // If leaving handle and not entering menu or editor, hide
          const related = e.relatedTarget as Node | null;
          if (
            !menuOpenRef.current &&
            related &&
            !editor.view.dom.contains(related) &&
            !menuContainerRef.current?.contains(related)
          ) {
            hideHandle();
          }
        }}
      >
        <button
          onMouseDown={(e) => { e.preventDefault(); handleAddBlock(); }}
          className="flex h-6 w-6 items-center justify-center rounded text-black/15 dark:text-white/15 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          draggable
          onClick={(e) => { e.preventDefault(); handleGripClick(); }}
          onDragStart={onDragStart as any}
          onDragEnd={onDragEnd}
          className="flex h-6 w-6 items-center justify-center rounded text-black/15 dark:text-white/15 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move · Click for menu"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block action menu */}
      {menuOpen && (
        <div
          ref={menuContainerRef}
          className="absolute z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up py-1 w-48"
          style={{ top: menuTop, left: 0 }}
        >
          {menuSub === "turnInto" ? (
            <>
              <MenuButton onClick={() => setMenuSub("main")}>← Back</MenuButton>
              {TURN_INTO.map((item) => (
                <MenuButton key={item.type} onClick={() => handleTurnInto(item.type)}>
                  <item.icon className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  {item.label}
                </MenuButton>
              ))}
            </>
          ) : menuSub === "color" ? (
            <>
              <MenuButton onClick={() => setMenuSub("main")}>← Back</MenuButton>
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
                      ...(c.value === ""
                        ? { background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" }
                        : {}),
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <MenuButton onClick={handleDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </MenuButton>
              <MenuButton onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Duplicate
              </MenuButton>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuButton onClick={() => setMenuSub("turnInto")}>
                <Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Turn into
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </MenuButton>
              <MenuButton onClick={() => setMenuSub("color")}>
                <Palette className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Color
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </MenuButton>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <MenuButton onClick={handleMoveUp}>
                <ArrowUp className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Move up
              </MenuButton>
              <MenuButton onClick={handleMoveDown}>
                <ArrowDown className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Move down
              </MenuButton>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ── Menu button helper ── */

function MenuButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        className ?? "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
