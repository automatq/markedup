import { Node, mergeAttributes } from "@tiptap/core";

export interface PageBreakOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * Page break node — renders as a dashed line in the editor,
 * and as an actual page break when printing/exporting to PDF.
 */
export const PageBreak = Node.create<PageBreakOptions>({
  name: "pageBreak",
  group: "block",
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
      { tag: 'div[style*="page-break"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "page-break",
        class:
          "my-6 border-t-2 border-dashed border-black/15 dark:border-white/15 relative",
        style: "page-break-after: always;",
      }),
      [
        "span",
        {
          class:
            "absolute left-1/2 -translate-x-1/2 -top-3 px-3 py-0.5 text-[10px] uppercase tracking-wider font-medium text-black/25 dark:text-white/25 bg-white dark:bg-black",
        },
        "Page Break",
      ],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name })
            .run(),
    };
  },
});
