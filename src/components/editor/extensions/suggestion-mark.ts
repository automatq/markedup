import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, EditorState } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";

export interface SuggestionMarkOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestionMark: {
      acceptSuggestion: (id: string) => ReturnType;
      rejectSuggestion: (id: string) => ReturnType;
      acceptAllSuggestions: () => ReturnType;
      rejectAllSuggestions: () => ReturnType;
      setSuggestingMode: (enabled: boolean, userId?: string, userName?: string) => ReturnType;
    };
  }
}

export const SUGGESTION_KEY = new PluginKey("suggestion-mark");

export const SuggestionMark = Mark.create<SuggestionMarkOptions>({
  name: "suggestion",
  inclusive: false,
  spanning: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addStorage() {
    return {
      suggestingMode: false,
      currentUserId: "",
      currentUserName: "",
    };
  },

  addAttributes() {
    return {
      id: { default: null },
      type: { default: "insert" },
      userId: { default: null },
      userName: { default: null },
      timestamp: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-suggestion]" }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const type = mark.attrs.type || "insert";
    const colorClass =
      type === "insert"
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500/60 underline-offset-2"
        : type === "delete"
          ? "bg-red-500/10 text-red-600 dark:text-red-400 line-through decoration-red-500/60"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 underline decoration-blue-500/60 underline-offset-2";

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-suggestion": "true",
        "data-suggestion-id": mark.attrs.id,
        "data-suggestion-type": type,
        "data-suggestion-user": mark.attrs.userName || "",
        class: `suggestion ${colorClass} cursor-help`,
        title: `${type} by ${mark.attrs.userName || "unknown"}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSuggestingMode:
        (enabled, userId, userName) =>
        ({ editor }) => {
          (editor.storage as any).suggestion = {
            suggestingMode: enabled,
            currentUserId: userId || (editor.storage as any).suggestion?.currentUserId || "",
            currentUserName: userName || (editor.storage as any).suggestion?.currentUserName || "",
          };
          return true;
        },

      acceptSuggestion:
        (id) =>
        ({ tr, state, dispatch }) => {
          return applySuggestionResolution(tr, state, dispatch, id, "accept");
        },

      rejectSuggestion:
        (id) =>
        ({ tr, state, dispatch }) => {
          return applySuggestionResolution(tr, state, dispatch, id, "reject");
        },

      acceptAllSuggestions:
        () =>
        ({ tr, state, dispatch }) => {
          return applySuggestionResolution(tr, state, dispatch, null, "accept");
        },

      rejectAllSuggestions:
        () =>
        ({ tr, state, dispatch }) => {
          return applySuggestionResolution(tr, state, dispatch, null, "reject");
        },
    };
  },

  addProseMirrorPlugins() {
    const markType = this.type;
    const editor = this.editor;

    return [
      new Plugin({
        key: SUGGESTION_KEY,

        appendTransaction(transactions, oldState, newState) {
          const storage = (editor.storage as any).suggestion;
          if (!storage?.suggestingMode) return null;

          // Skip if no doc change or this transaction was already processed
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta("suggestion-bypass"))) return null;
          if (transactions.some((tr) => tr.getMeta("addToHistory") === false)) return null;

          const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
          const userId = storage.currentUserId;
          const userName = storage.currentUserName || "You";
          const timestamp = new Date().toISOString();

          let tr = newState.tr;
          let modified = false;

          for (const t of transactions) {
            if (!t.docChanged) continue;

            for (const step of t.steps) {
              if (!(step instanceof ReplaceStep)) continue;

              const stepJson = step.toJSON();
              const fromOld = stepJson.from;
              const toOld = stepJson.to;
              const slice = step.slice;
              const insertedSize = slice.size;

              // Map from "after this step is applied within transaction t" to newState
              // We need positions in newState, so map through both t.mapping (after this step)
              // and any subsequent transactions
              let txIndex = transactions.indexOf(t);
              const restMappings = transactions.slice(txIndex + 1).map((tx) => tx.mapping);

              const stepIndex = t.steps.indexOf(step);
              const stepMap = step.getMap();
              // Position in newState where the insertion ENDS
              const startInT = stepMap.map(fromOld, -1);
              const endInT = stepMap.map(fromOld, 1);
              // The mapped range covers the insertion in t's "after" doc
              let startInNew = startInT;
              let endInNew = endInT;
              for (const m of restMappings) {
                startInNew = m.map(startInNew, -1);
                endInNew = m.map(endInNew, 1);
              }

              if (insertedSize > 0 && startInNew < endInNew && endInNew <= newState.doc.content.size) {
                const mark = markType.create({
                  id,
                  type: "insert",
                  userId,
                  userName,
                  timestamp,
                });
                tr.addMark(startInNew, endInNew, mark);
                modified = true;
              }
            }
          }

          if (modified) {
            tr.setMeta("suggestion-bypass", true);
            tr.setMeta("addToHistory", false);
            return tr;
          }
          return null;
        },
      }),
    ];
  },
});

function applySuggestionResolution(
  tr: any,
  state: EditorState,
  dispatch: ((tr: any) => void) | undefined,
  id: string | null,
  action: "accept" | "reject"
): boolean {
  const { doc } = state;
  const ranges: { from: number; to: number; type: string }[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "suggestion") continue;
      if (id && mark.attrs.id !== id) continue;
      ranges.push({
        from: pos,
        to: pos + node.nodeSize,
        type: mark.attrs.type,
      });
    }
  });

  if (ranges.length === 0) return false;

  // Process in reverse order to keep positions stable
  ranges.sort((a, b) => b.from - a.from);

  const markType = state.schema.marks.suggestion;

  for (const r of ranges) {
    const shouldDelete =
      (action === "accept" && r.type === "delete") ||
      (action === "reject" && r.type === "insert");

    if (shouldDelete) {
      tr.delete(r.from, r.to);
    } else {
      tr.removeMark(r.from, r.to, markType);
    }
  }

  tr.setMeta("suggestion-bypass", true);
  if (dispatch) dispatch(tr);
  return true;
}
