import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ToggleView } from "./ToggleView";

export interface ToggleOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

export const Toggle = Node.create<ToggleOptions>({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      open: { default: true },
      summary: { default: "Toggle heading" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const summary = el.querySelector("summary");
          return {
            open: el.hasAttribute("open"),
            summary: summary?.textContent || "Toggle heading",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        open: node.attrs.open ? "true" : undefined,
      }),
      ["summary", {}, node.attrs.summary || "Toggle heading"],
      ["div", {}, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true, summary: "Toggle heading" },
              content: [{ type: "paragraph" }],
            })
            .run(),
    };
  },
});
