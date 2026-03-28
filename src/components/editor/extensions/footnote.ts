import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FootnoteView } from "./FootnoteView";

export interface FootnoteOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (content?: string) => ReturnType;
    };
  }
}

/**
 * Inline footnote node — renders as a superscript number in the editor.
 * The footnote text is stored in the `content` attribute.
 * All footnotes are auto-numbered based on document order.
 */
export const Footnote = Node.create<FootnoteOptions>({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      content: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "footnote",
        class:
          "inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-black/8 dark:bg-white/10 text-black/60 dark:text-white/60 cursor-pointer align-super ml-0.5 hover:bg-black/12 dark:hover:bg-white/15 transition-colors",
        title: HTMLAttributes.content || "Footnote",
      }),
      "•",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteView, { as: "span" });
  },

  addCommands() {
    return {
      insertFootnote:
        (content = "") =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { content },
            })
            .run(),
    };
  },
});
