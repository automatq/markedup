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

interface BlockInfo {
  node: HTMLElement;
  pos: number;
  top: number;
}

export function BlockHandle({ editor }: BlockHandleProps) {
  const [hovered, setHovered] = useState<BlockInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragNode = useRef<{ pos: number; node: HTMLElement } | null>(null);

  // Detect which top-level block the mouse is over
  useEffect(() => {
    const editorDom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen) return; // Don't change hovered block while menu is open

      const editorRect = editorDom.getBoundingClientRect();
      // Only track when mouse is within editor bounds (with some left margin for the handle)
      if (
        e.clientX < editorRect.left - 50 ||
        e.clientX > editorRect.right + 10 ||
        e.clientY < editorRect.top ||
        e.clientY > editorRect.bottom
      ) {
        setHovered(null);
        return;
      }

      // Find the top-level block element under the cursor
      const pos = editor.view.posAtCoords({ left: editorRect.left + 40, top: e.clientY });
      if (!pos) {
        setHovered(null);
        return;
      }

      const resolved = editor.state.doc.resolve(pos.pos);
      // Walk up to depth 1 (top-level block)
      if (resolved.depth < 1) {
        setHovered(null);
        return;
      }

      const blockPos = resolved.before(1);
      const domNode = editor.view.nodeDOM(blockPos);
      if (!domNode || !(domNode instanceof HTMLElement)) {
        setHovered(null);
        return;
      }

      const blockRect = domNode.getBoundingClientRect();
      const top = blockRect.top - editorRect.top;

      setHovered((prev) => {
        if (prev?.node === domNode) return prev;
        // Remove highlight from previous
        prev?.node.classList.remove("block-hover-active");
        // Add to new
        domNode.classList.add("block-hover-active");
        return { node: domNode, pos: blockPos, top };
      });
    };

    const handleMouseLeave = () => {
      if (!menuOpen) {
        hovered?.node.classList.remove("block-hover-active");
        setHovered(null);
      }
    };

    editorDom.addEventListener("mousemove", handleMouseMove);
    editorDom.addEventListener("mouseleave", handleMouseLeave);

    // Also track mouse on the handle area itself
    const parentEl = editorDom.parentElement;
    if (parentEl) {
      parentEl.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      editorDom.removeEventListener("mousemove", handleMouseMove);
      editorDom.removeEventListener("mouseleave", handleMouseLeave);
      if (parentEl) {
        parentEl.removeEventListener("mousemove", handleMouseMove);
      }
      hovered?.node.classList.remove("block-hover-active");
    };
  }, [editor, menuOpen, hovered]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        handleRef.current && !handleRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setTurnIntoOpen(false);
        setColorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Clear selected block on editor click
  useEffect(() => {
    const handleClick = () => {
      if (selectedBlock) {
        selectedBlock.classList.remove("block-selected");
        setSelectedBlock(null);
      }
    };
    editor.view.dom.addEventListener("click", handleClick);
    return () => editor.view.dom.removeEventListener("click", handleClick);
  }, [editor, selectedBlock]);

  // + button: insert paragraph below and focus
  const handleAddBlock = useCallback(() => {
    if (!hovered) return;
    const endPos = hovered.pos + (editor.state.doc.nodeAt(hovered.pos)?.nodeSize ?? 1);
    editor
      .chain()
      .focus()
      .insertContentAt(endPos, { type: "paragraph" })
      .setTextSelection(endPos + 1)
      .run();
    // Trigger slash command by inserting /
    setTimeout(() => {
      editor.commands.insertContent("/");
    }, 50);
  }, [editor, hovered]);

  // Handle click: select block + open menu
  const handleGripClick = useCallback(() => {
    if (!hovered) return;

    // Select the block visually
    selectedBlock?.classList.remove("block-selected");
    hovered.node.classList.add("block-selected");
    setSelectedBlock(hovered.node);

    // Select the node in ProseMirror
    try {
      const node = editor.state.doc.nodeAt(hovered.pos);
      if (node) {
        const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, hovered.pos));
        editor.view.dispatch(tr);
      }
    } catch {
      // Some nodes don't support NodeSelection, that's fine
    }

    setMenuOpen(true);
    setTurnIntoOpen(false);
    setColorOpen(false);
  }, [editor, hovered, selectedBlock]);

  // Menu actions
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setTurnIntoOpen(false);
    setColorOpen(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (!hovered) return;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (!node) return;
    editor.chain().focus().deleteRange({ from: hovered.pos, to: hovered.pos + node.nodeSize }).run();
    selectedBlock?.classList.remove("block-selected");
    setSelectedBlock(null);
    closeMenu();
    setHovered(null);
  }, [editor, hovered, selectedBlock, closeMenu]);

  const handleDuplicate = useCallback(() => {
    if (!hovered) return;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (!node) return;
    const insertAt = hovered.pos + node.nodeSize;
    editor.chain().focus().insertContentAt(insertAt, node.toJSON()).run();
    closeMenu();
  }, [editor, hovered, closeMenu]);

  const handleMoveUp = useCallback(() => {
    if (!hovered || hovered.pos === 0) return;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (!node) return;
    const blockEnd = hovered.pos + node.nodeSize;
    const $prev = editor.state.doc.resolve(hovered.pos - 1);
    const prevStart = $prev.before(1);
    editor
      .chain()
      .focus()
      .deleteRange({ from: hovered.pos, to: blockEnd })
      .insertContentAt(prevStart, node.toJSON())
      .run();
    closeMenu();
  }, [editor, hovered, closeMenu]);

  const handleMoveDown = useCallback(() => {
    if (!hovered) return;
    const node = editor.state.doc.nodeAt(hovered.pos);
    if (!node) return;
    const blockEnd = hovered.pos + node.nodeSize;
    if (blockEnd >= editor.state.doc.content.size) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: hovered.pos, to: blockEnd })
      .insertContentAt(blockEnd - node.nodeSize + (editor.state.doc.nodeAt(blockEnd)?.nodeSize ?? 0), node.toJSON())
      .run();
    closeMenu();
  }, [editor, hovered, closeMenu]);

  const handleTurnInto = useCallback(
    (type: string) => {
      if (!hovered) return;
      editor.chain().focus().setTextSelection(hovered.pos + 1).run();

      switch (type) {
        case "paragraph":
          editor.chain().focus().setParagraph().run();
          break;
        case "h1":
          editor.chain().focus().setHeading({ level: 1 }).run();
          break;
        case "h2":
          editor.chain().focus().setHeading({ level: 2 }).run();
          break;
        case "h3":
          editor.chain().focus().setHeading({ level: 3 }).run();
          break;
        case "bulletList":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "orderedList":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "taskList":
          editor.chain().focus().toggleTaskList().run();
          break;
        case "blockquote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "codeBlock":
          editor.chain().focus().toggleCodeBlock().run();
          break;
      }
      closeMenu();
    },
    [editor, hovered, closeMenu]
  );

  const handleColor = useCallback(
    (color: string) => {
      if (!hovered) return;
      const node = editor.state.doc.nodeAt(hovered.pos);
      if (!node) return;
      // Select all text in the block and apply color
      editor
        .chain()
        .focus()
        .setTextSelection({ from: hovered.pos + 1, to: hovered.pos + node.nodeSize - 1 })
        .setColor(color)
        .run();
      closeMenu();
    },
    [editor, hovered, closeMenu]
  );

  // Drag and drop
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!hovered) return;
      dragNode.current = { pos: hovered.pos, node: hovered.node };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
      // Use the block element as drag image
      e.dataTransfer.setDragImage(hovered.node, 0, 0);
      hovered.node.style.opacity = "0.4";
    },
    [hovered]
  );

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) {
      dragNode.current.node.style.opacity = "";
      dragNode.current = null;
    }
  }, []);

  // Drop handler on the editor
  useEffect(() => {
    const editorDom = editor.view.dom;

    const handleDragOver = (e: DragEvent) => {
      if (!dragNode.current) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
    };

    const handleDrop = (e: DragEvent) => {
      if (!dragNode.current) return;
      e.preventDefault();

      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) return;

      const resolved = editor.state.doc.resolve(pos.pos);
      if (resolved.depth < 1) return;

      const targetPos = resolved.before(1);
      const sourcePos = dragNode.current.pos;
      const sourceNode = editor.state.doc.nodeAt(sourcePos);
      if (!sourceNode || targetPos === sourcePos) return;

      const sourceEnd = sourcePos + sourceNode.nodeSize;

      // Delete source, then insert at target (adjust for position shift)
      if (targetPos < sourcePos) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: sourcePos, to: sourceEnd })
          .insertContentAt(targetPos, sourceNode.toJSON())
          .run();
      } else {
        editor
          .chain()
          .focus()
          .deleteRange({ from: sourcePos, to: sourceEnd })
          .insertContentAt(targetPos - sourceNode.nodeSize, sourceNode.toJSON())
          .run();
      }

      dragNode.current.node.style.opacity = "";
      dragNode.current = null;
    };

    editorDom.addEventListener("dragover", handleDragOver);
    editorDom.addEventListener("drop", handleDrop);
    return () => {
      editorDom.removeEventListener("dragover", handleDragOver);
      editorDom.removeEventListener("drop", handleDrop);
    };
  }, [editor]);

  if (!hovered) return null;

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

  return (
    <>
      {/* Handle buttons: + and ⠿ */}
      <div
        ref={handleRef}
        className="absolute z-30 flex items-center gap-0.5 transition-opacity"
        style={{ top: hovered.top, left: 0 }}
      >
        {/* Add block button */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleAddBlock();
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Drag handle / menu trigger */}
        <button
          draggable
          onMouseDown={(e) => {
            // Allow drag but also handle click
            if (e.detail === 1) {
              // Will be handled by onClick
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            handleGripClick();
          }}
          onDragStart={handleDragStart as any}
          onDragEnd={handleDragEnd}
          className="flex h-6 w-6 items-center justify-center rounded text-black/20 dark:text-white/20 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move · Click for menu"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block action menu */}
      {menuOpen && hovered && (
        <div
          ref={menuRef}
          className="absolute z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up py-1 w-48"
          style={{ top: hovered.top + 28, left: 0 }}
        >
          {turnIntoOpen ? (
            <>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTurnIntoOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
              >
                ← Back
              </button>
              {TURN_INTO.map((item) => (
                <button
                  key={item.type}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTurnInto(item.type)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <item.icon className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  {item.label}
                </button>
              ))}
            </>
          ) : colorOpen ? (
            <>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
              >
                ← Back
              </button>
              <div className="px-3 py-2 grid grid-cols-5 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleColor(c.value)}
                    title={c.name}
                    className="h-6 w-6 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: c.value || "transparent",
                      ...(c.value === "" ? { background: "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)" } : {}),
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDelete}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDuplicate}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Duplicate
              </button>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setTurnIntoOpen(true)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Turn into
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorOpen(true)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Palette className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Color
                <span className="ml-auto text-black/25 dark:text-white/25">→</span>
              </button>
              <div className="h-px bg-black/6 dark:bg-white/6 my-1" />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleMoveUp}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowUp className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Move up
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleMoveDown}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowDown className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                Move down
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
