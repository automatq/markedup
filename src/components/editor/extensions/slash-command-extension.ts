import { Extension } from "@tiptap/core";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { filterSlashCommands, SlashCommandItem } from "../menus/slash-command";

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => filterSlashCommands(query),
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
