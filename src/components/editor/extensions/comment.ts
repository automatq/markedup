import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attrs: { id: string; author?: string }) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

/**
 * Inline comment mark — highlights text that has a comment thread attached.
 * The comment data itself lives in a separate store (React state or DB),
 * this mark just references the thread ID.
 */
export const Comment = Mark.create<CommentOptions>({
  name: "comment",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      id: { default: null },
      author: { default: null },
      resolved: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-comment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-comment": HTMLAttributes.id,
        class: HTMLAttributes.resolved
          ? "bg-transparent border-b border-dashed border-black/20 dark:border-white/20 cursor-pointer"
          : "bg-amber-500/10 dark:bg-amber-400/10 border-b-2 border-amber-500/40 dark:border-amber-400/40 cursor-pointer",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
