import { Node, mergeAttributes } from "@tiptap/core";

export interface BacklinkOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    backlink: {
      setBacklink: (attrs: { title: string }) => ReturnType;
    };
  }
}

/**
 * Inline node representing a [[backlink]] to another document.
 * Rendered as a clickable pill in the editor.
 */
export const Backlink = Node.create<BacklinkOptions>({
  name: "backlink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-backlink]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-backlink": node.attrs.title,
        class:
          "inline-flex items-center px-1.5 py-0.5 rounded-md border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-black/70 dark:text-white/70 text-sm font-medium cursor-pointer hover:border-black/20 hover:bg-black/[0.06] dark:hover:border-white/25 dark:hover:bg-white/[0.07] transition-all",
      }),
      `[[${node.attrs.title}]]`,
    ];
  },

  addCommands() {
    return {
      setBacklink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
