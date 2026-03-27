import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidBlockView } from "./MermaidBlockView";

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      setMermaidBlock: (attrs?: { content?: string }) => ReturnType;
    };
  }
}

export const MermaidBlock = Node.create<MermaidBlockOptions>({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      content: { default: "graph TD\n  A[Start] --> B[End]" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "mermaid-block",
      }),
      node.attrs.content,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },

  addCommands() {
    return {
      setMermaidBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { content: attrs?.content ?? "graph TD\n  A[Start] --> B[End]" },
            })
            .run(),
    };
  },
});
