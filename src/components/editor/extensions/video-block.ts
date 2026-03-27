import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoBlockView } from "./VideoBlockView";

export interface VideoBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoBlock: {
      setVideoBlock: (attrs: { src: string }) => ReturnType;
    };
  }
}

export const VideoBlock = Node.create<VideoBlockOptions>({
  name: "videoBlock",
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
    return [{ tag: 'div[data-type="video-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "video-block",
        "data-src": node.attrs.src,
      }),
      ["video", { src: node.attrs.src, controls: "true" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView);
  },

  addCommands() {
    return {
      setVideoBlock:
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
