import { Extension } from "@tiptap/core";

/**
 * Notion-style keyboard shortcuts for the MarkedUp editor.
 *
 * Block type conversions:  Cmd+Alt+0-9
 * Block manipulation:      Cmd+Shift+Up/Down, Cmd+D, Tab/Shift+Tab
 * Formatting aliases:      Cmd+Shift+S (strike), Cmd+Shift+H (highlight)
 */
export const KeyboardShortcuts = Extension.create({
  name: "notionShortcuts",

  addKeyboardShortcuts() {
    return {
      /* ── Block type conversions (Cmd+Alt+Number) ── */

      "Mod-Alt-0": ({ editor }) =>
        editor.chain().focus().setParagraph().run(),

      "Mod-Alt-1": ({ editor }) =>
        editor.chain().focus().setHeading({ level: 1 }).run(),

      "Mod-Alt-2": ({ editor }) =>
        editor.chain().focus().setHeading({ level: 2 }).run(),

      "Mod-Alt-3": ({ editor }) =>
        editor.chain().focus().setHeading({ level: 3 }).run(),

      "Mod-Alt-4": ({ editor }) =>
        editor.chain().focus().toggleTaskList().run(),

      "Mod-Alt-5": ({ editor }) =>
        editor.chain().focus().toggleBulletList().run(),

      "Mod-Alt-6": ({ editor }) =>
        editor.chain().focus().toggleOrderedList().run(),

      "Mod-Alt-7": ({ editor }) =>
        editor.chain().focus().setToggle().run(),

      "Mod-Alt-8": ({ editor }) =>
        editor.chain().focus().toggleCodeBlock().run(),

      "Mod-Alt-9": ({ editor }) =>
        editor.chain().focus().toggleBlockquote().run(),

      /* ── Text formatting aliases ── */

      // Notion uses Cmd+Shift+S for strikethrough (Tiptap default is Cmd+Shift+X)
      "Mod-Shift-s": ({ editor }) =>
        editor.chain().focus().toggleStrike().run(),

      // Toggle highlight
      "Mod-Shift-h": ({ editor }) =>
        editor.chain().focus().toggleHighlight().run(),

      /* ── Undo / Redo (explicit — ensures Yjs undo works) ── */

      "Mod-z": ({ editor }) => editor.commands.undo(),

      "Shift-Mod-z": ({ editor }) => editor.commands.redo(),

      "Mod-y": ({ editor }) => editor.commands.redo(),

      /* ── Block manipulation ── */

      // Duplicate block — must return true to prevent browser "Add Bookmark"
      "Mod-d": ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Walk up to find a wrapping block (table, callout, toggle, etc.)
        const wrapperTypes = [
          "table", "callout", "toggle", "codeBlock",
          "blockquote", "taskList", "bulletList", "orderedList",
        ];
        let depth = $from.depth;
        while (depth > 1) {
          const node = $from.node(depth);
          if (wrapperTypes.includes(node.type.name)) {
            const to = $from.after(depth);
            editor.chain().focus().insertContentAt(to, node.toJSON()).run();
            return true;
          }
          depth--;
        }

        // Fallback: duplicate the top-level block (paragraph, heading, etc.)
        if ($from.depth >= 1) {
          const node = $from.node(1);
          const to = $from.after(1);
          editor.chain().focus().insertContentAt(to, node.toJSON()).run();
        }
        return true; // Always prevent browser bookmark
      },

      // Move block up
      "Mod-Shift-ArrowUp": ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        if ($from.depth < 1) return false;

        const blockStart = $from.before(1);
        if (blockStart === 0) return false; // Already the first block

        const blockEnd = $from.after(1);
        const node = state.doc.nodeAt(blockStart);
        if (!node) return false;

        // Find previous block start
        const $prev = state.doc.resolve(blockStart - 1);
        const prevStart = $prev.before(1);

        // Delete current block, insert before previous block
        editor
          .chain()
          .focus()
          .deleteRange({ from: blockStart, to: blockEnd })
          .insertContentAt(prevStart, node.toJSON())
          .run();
        return true;
      },

      // Move block down
      "Mod-Shift-ArrowDown": ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        if ($from.depth < 1) return false;

        const blockStart = $from.before(1);
        const blockEnd = $from.after(1);
        if (blockEnd >= state.doc.content.size) return false; // Already the last block

        const node = state.doc.nodeAt(blockStart);
        if (!node) return false;

        // Find next block end
        const $next = state.doc.resolve(blockEnd + 1);
        const nextEnd = $next.after(1);

        // Delete current block, insert after next block
        // We delete first, so the insertion position shifts
        editor
          .chain()
          .focus()
          .deleteRange({ from: blockStart, to: blockEnd })
          .insertContentAt(nextEnd - (blockEnd - blockStart), node.toJSON())
          .run();
        return true;
      },

      /* ── List indent/outdent ── */

      Tab: ({ editor }) => {
        if (editor.can().sinkListItem("listItem")) {
          return editor.chain().focus().sinkListItem("listItem").run();
        }
        if (editor.can().sinkListItem("taskItem")) {
          return editor.chain().focus().sinkListItem("taskItem").run();
        }
        return false; // Don't trap Tab outside lists
      },

      "Shift-Tab": ({ editor }) => {
        if (editor.can().liftListItem("listItem")) {
          return editor.chain().focus().liftListItem("listItem").run();
        }
        if (editor.can().liftListItem("taskItem")) {
          return editor.chain().focus().liftListItem("taskItem").run();
        }
        return false;
      },
    };
  },
});
