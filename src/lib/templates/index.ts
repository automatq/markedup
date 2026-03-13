import { JSONContent } from "@tiptap/core";

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "work" | "personal" | "engineering" | "general";
  content: JSONContent;
}

export const templates: DocumentTemplate[] = [
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Agenda, attendees, action items",
    icon: "Users",
    category: "work",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Meeting Notes" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Date: " }, { type: "text", text: "March 13, 2026" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Attendees: " }, { type: "text", text: "@name, @name" }] },
        { type: "horizontalRule" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Agenda" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 2" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 3" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Discussion" }] },
        { type: "paragraph", content: [{ type: "text", text: "Notes from the meeting..." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Action Items" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 1 — @owner" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 2 — @owner" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 3 — @owner" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Next Steps" }] },
        { type: "paragraph", content: [{ type: "text", text: "Follow up by..." }] },
      ],
    },
  },
  {
    id: "project-brief",
    title: "Project Brief",
    description: "Goals, scope, timeline, stakeholders",
    icon: "Target",
    category: "work",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Project Brief" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Status: " }, { type: "text", text: "Draft" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Owner: " }, { type: "text", text: "@name" }] },
        { type: "horizontalRule" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "A brief description of the project and why it matters." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Primary goal" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secondary goal" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Scope" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "In Scope" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Feature A" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Feature B" }] }] },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Out of Scope" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Not doing X" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Timeline" }] },
        { type: "table", content: [
          { type: "tableRow", content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Phase" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Date" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Owner" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Discovery" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Week 1-2" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "@name" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Build" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Week 3-6" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "@name" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Launch" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Week 7" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "@name" }] }] },
          ]},
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Stakeholders" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Engineering — @name" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Design — @name" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Product — @name" }] }] },
        ]},
      ],
    },
  },
  {
    id: "daily-journal",
    title: "Daily Journal",
    description: "Reflections, wins, blockers",
    icon: "BookOpen",
    category: "personal",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Daily Journal — March 13, 2026" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Wins" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "What went well today..." }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Blockers" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "What got in the way..." }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tomorrow" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Priority 1" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Priority 2" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
        { type: "paragraph", content: [{ type: "text", text: "Free-form thoughts..." }] },
      ],
    },
  },
  {
    id: "bug-report",
    title: "Bug Report",
    description: "Steps to reproduce, expected vs actual",
    icon: "Bug",
    category: "engineering",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Bug Report" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Severity: " }, { type: "text", text: "P1 / P2 / P3" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Reporter: " }, { type: "text", text: "@name" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Assigned to: " }, { type: "text", text: "@name" }] },
        { type: "horizontalRule" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Description" }] },
        { type: "paragraph", content: [{ type: "text", text: "A clear summary of the bug." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Steps to Reproduce" }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Go to..." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Click on..." }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Observe..." }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Expected Behavior" }] },
        { type: "paragraph", content: [{ type: "text", text: "What should happen..." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Actual Behavior" }] },
        { type: "paragraph", content: [{ type: "text", text: "What actually happens..." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Environment" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Browser: Chrome 120" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "OS: macOS 15" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Version: v1.0.0" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Screenshots" }] },
        { type: "paragraph", content: [{ type: "text", text: "Attach screenshots here..." }] },
      ],
    },
  },
  {
    id: "technical-spec",
    title: "Technical Spec",
    description: "Architecture, API design, data models",
    icon: "FileCode",
    category: "engineering",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Technical Specification" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Author: " }, { type: "text", text: "@name" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Status: " }, { type: "text", text: "Draft → Review → Approved" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Related: " }, { type: "text", text: "[[Project Brief]]" }] },
        { type: "horizontalRule" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Context" }] },
        { type: "paragraph", content: [{ type: "text", text: "Why we're building this and what problem it solves." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Architecture" }] },
        { type: "paragraph", content: [{ type: "text", text: "High-level system design..." }] },
        { type: "codeBlock", attrs: { language: "text" }, content: [{ type: "text", text: "┌──────────┐     ┌──────────┐     ┌──────────┐\n│  Client   │────▶│   API    │────▶│    DB    │\n└──────────┘     └──────────┘     └──────────┘" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "API Design" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Endpoints" }] },
        { type: "table", content: [
          { type: "tableRow", content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Method" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Path" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Description" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "GET" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "/api/resource" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "List resources" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "POST" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "/api/resource" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Create resource" }] }] },
          ]},
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Data Model" }] },
        { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "interface Resource {\n  id: string;\n  name: string;\n  createdAt: Date;\n  updatedAt: Date;\n}" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Open Questions" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Question 1?" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Question 2?" }] }] },
        ]},
      ],
    },
  },
  {
    id: "weekly-standup",
    title: "Weekly Standup",
    description: "This week, next week, blockers",
    icon: "CalendarCheck",
    category: "work",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Weekly Standup — Week of March 13" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Completed This Week" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Shipped feature X" }] }] },
          { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Fixed bug Y" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Started work on Z (in progress)" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Plan for Next Week" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Priority 1" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Priority 2" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Priority 3" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Blockers" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Waiting on review from @name" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
        { type: "paragraph", content: [{ type: "text", text: "Anything else to flag..." }] },
      ],
    },
  },
  {
    id: "blank",
    title: "Blank Document",
    description: "Start from scratch",
    icon: "File",
    category: "general",
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [] },
      ],
    },
  },
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): DocumentTemplate[] {
  return templates.filter((t) => t.category === category);
}
