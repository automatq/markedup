export interface EditNotification {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  action: EditAction;
  sectionTitle: string | null;
  /** e.g. "heading", "paragraph", "table", "codeBlock" */
  nodeType: string;
  timestamp: Date;
  read: boolean;
}

export type EditAction =
  | "edited"
  | "added"
  | "deleted"
  | "formatted"
  | "moved"
  | "commented";

export function describeNotification(n: EditNotification): string {
  const section = n.sectionTitle ? ` in "${n.sectionTitle}"` : "";
  switch (n.action) {
    case "edited":
      return `edited ${humanNodeType(n.nodeType)}${section}`;
    case "added":
      return `added a ${humanNodeType(n.nodeType)}${section}`;
    case "deleted":
      return `removed a ${humanNodeType(n.nodeType)}${section}`;
    case "formatted":
      return `formatted text${section}`;
    case "moved":
      return `moved content${section}`;
    case "commented":
      return `left a comment${section}`;
    default:
      return `made changes${section}`;
  }
}

function humanNodeType(nodeType: string): string {
  const map: Record<string, string> = {
    heading: "heading",
    paragraph: "paragraph",
    table: "table",
    codeBlock: "code block",
    bulletList: "bullet list",
    orderedList: "numbered list",
    taskList: "task list",
    taskItem: "task",
    blockquote: "quote",
    callout: "callout",
    image: "image",
    toggle: "toggle",
    horizontalRule: "divider",
  };
  return map[nodeType] ?? "content";
}
