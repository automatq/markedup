import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PdfBlockView } from "./PdfBlockView";

export interface PdfBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfBlock: {
      setPdfBlock: (attrs: { src: string }) => ReturnType;
    };
  }
}

export const PdfBlock = Node.create<PdfBlockOptions>({
  name: "pdfBlock",
  group: "block",
  atom: true,
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="pdf-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "pdf-block",
        "data-src": node.attrs.src,
      }),
      ["embed", { src: node.attrs.src, type: "application/pdf", width: "100%", height: "600px" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfBlockView);
  },

  addCommands() {
    return {
      setPdfBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run(),
    };
  },
});
