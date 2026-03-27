import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AudioBlockView } from "./AudioBlockView";

export interface AudioBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioBlock: {
      setAudioBlock: (attrs: { src: string }) => ReturnType;
    };
  }
}

export const AudioBlock = Node.create<AudioBlockOptions>({
  name: "audioBlock",
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
    return [{ tag: 'div[data-type="audio-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "audio-block",
        "data-src": node.attrs.src,
      }),
      ["audio", { src: node.attrs.src, controls: "true" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioBlockView);
  },

  addCommands() {
    return {
      setAudioBlock:
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
