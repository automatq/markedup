import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  results: { from: number; to: number }[];
  currentIndex: number;
}

const searchPluginKey = new PluginKey("searchReplace");

function findMatches(doc: any, searchTerm: string): { from: number; to: number }[] {
  if (!searchTerm) return [];
  const results: { from: number; to: number }[] = [];
  const term = searchTerm.toLowerCase();
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const text = node.text!.toLowerCase();
      let index = text.indexOf(term);
      while (index !== -1) {
        results.push({ from: pos + index, to: pos + index + searchTerm.length });
        index = text.indexOf(term, index + 1);
      }
    }
  });
  return results;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      replaceCurrentResult: () => ReturnType;
      replaceAllResults: () => ReturnType;
      closeSearch: () => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create<{}, SearchReplaceStorage>({
  name: "searchReplace",

  addStorage() {
    return {
      searchTerm: "",
      replaceTerm: "",
      results: [],
      currentIndex: 0,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          storage.searchTerm = term;
          storage.results = findMatches(editor.state.doc, term);
          storage.currentIndex = 0;

          // Scroll to first result
          if (storage.results.length > 0) {
            const { from } = storage.results[0];
            editor.commands.setTextSelection(from);
          }

          // Force view update
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },

      setReplaceTerm:
        (term: string) =>
        ({ editor }) => {
          ((editor.storage as any).searchReplace as SearchReplaceStorage).replaceTerm = term;
          return true;
        },

      nextSearchResult:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          if (storage.results.length === 0) return false;
          storage.currentIndex = (storage.currentIndex + 1) % storage.results.length;
          const { from } = storage.results[storage.currentIndex];
          editor.commands.setTextSelection(from);
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },

      previousSearchResult:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          if (storage.results.length === 0) return false;
          storage.currentIndex =
            (storage.currentIndex + storage.results.length - 1) % storage.results.length;
          const { from } = storage.results[storage.currentIndex];
          editor.commands.setTextSelection(from);
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },

      replaceCurrentResult:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          if (storage.results.length === 0) return false;
          const result = storage.results[storage.currentIndex];
          editor
            .chain()
            .focus()
            .setTextSelection({ from: result.from, to: result.to })
            .deleteSelection()
            .insertContent(storage.replaceTerm)
            .run();

          // Recompute matches
          storage.results = findMatches(editor.state.doc, storage.searchTerm);
          if (storage.currentIndex >= storage.results.length) {
            storage.currentIndex = 0;
          }
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },

      replaceAllResults:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          if (storage.results.length === 0) return false;

          // Replace from end to start to preserve positions
          const sorted = [...storage.results].sort((a, b) => b.from - a.from);
          let { tr } = editor.state;
          for (const result of sorted) {
            tr = tr.replaceWith(
              result.from,
              result.to,
              editor.state.schema.text(storage.replaceTerm)
            );
          }
          editor.view.dispatch(tr);

          storage.results = [];
          storage.currentIndex = 0;
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },

      closeSearch:
        () =>
        ({ editor }) => {
          const storage = (editor.storage as any).searchReplace as SearchReplaceStorage;
          storage.searchTerm = "";
          storage.replaceTerm = "";
          storage.results = [];
          storage.currentIndex = 0;
          editor.view.dispatch(editor.state.tr.setMeta(searchPluginKey, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _old, _oldState, newState) {
            // Only recompute when our meta is set or the doc changes
            if (!tr.getMeta(searchPluginKey) && !tr.docChanged) return _old;

            const storage = extensionThis.storage as SearchReplaceStorage;
            if (!storage.searchTerm) return DecorationSet.empty;

            // Recompute if doc changed
            if (tr.docChanged) {
              storage.results = findMatches(newState.doc, storage.searchTerm);
              if (storage.currentIndex >= storage.results.length) {
                storage.currentIndex = 0;
              }
            }

            const decorations = storage.results.map((result, i) =>
              Decoration.inline(result.from, result.to, {
                class:
                  i === storage.currentIndex
                    ? "search-result-current"
                    : "search-result",
              })
            );

            return DecorationSet.create(newState.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
