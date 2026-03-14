import { JSONContent } from "@tiptap/core";

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "work" | "personal" | "engineering" | "design" | "general";
  color: string;
  preview: string[];
  content: JSONContent;
}

// ── Helper builders ──────────────────────────────────────────────

const h1 = (text: string): JSONContent => ({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text }] });
const h2 = (text: string): JSONContent => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const h3 = (text: string): JSONContent => ({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] });
const p = (text: string): JSONContent => ({ type: "paragraph", content: [{ type: "text", text }] });
const pEmpty = (): JSONContent => ({ type: "paragraph" });
const bold = (label: string, value: string): JSONContent => ({
  type: "paragraph",
  content: [
    { type: "text", marks: [{ type: "bold" }], text: label },
    { type: "text", text: value },
  ],
});
const hr = (): JSONContent => ({ type: "horizontalRule" });
const bullet = (...items: string[]): JSONContent => ({
  type: "bulletList",
  content: items.map((t) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});
const numbered = (...items: string[]): JSONContent => ({
  type: "orderedList",
  content: items.map((t) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: t }] }],
  })),
});
const tasks = (...items: { text: string; checked?: boolean }[]): JSONContent => ({
  type: "taskList",
  content: items.map((t) => ({
    type: "taskItem",
    attrs: { checked: t.checked ?? false },
    content: [{ type: "paragraph", content: [{ type: "text", text: t.text }] }],
  })),
});
const table = (headers: string[], ...rows: string[][]): JSONContent => ({
  type: "table",
  content: [
    {
      type: "tableRow",
      content: headers.map((h) => ({
        type: "tableHeader",
        content: [{ type: "paragraph", content: [{ type: "text", text: h }] }],
      })),
    },
    ...rows.map((row) => ({
      type: "tableRow",
      content: row.map((cell) => ({
        type: "tableCell",
        content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }],
      })),
    })),
  ],
});
const code = (lang: string, text: string): JSONContent => ({
  type: "codeBlock",
  attrs: { language: lang },
  content: [{ type: "text", text }],
});

// ── Templates ────────────────────────────────────────────────────

export const templates: DocumentTemplate[] = [
  // ── General ──
  {
    id: "blank",
    title: "Blank Page",
    description: "Start from scratch",
    icon: "File",
    category: "general",
    color: "#737373",
    preview: ["Empty page", "Just start typing"],
    content: { type: "doc", content: [pEmpty()] },
  },

  // ── Work ──
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Agenda, attendees, decisions & action items",
    icon: "Users",
    category: "work",
    color: "#6366f1",
    preview: ["Attendees", "Agenda", "Action Items", "Decisions"],
    content: {
      type: "doc",
      content: [
        h1("Meeting Notes"),
        table(
          ["Field", "Details"],
          ["Date", new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
          ["Time", ""],
          ["Location", ""],
          ["Facilitator", ""],
        ),
        hr(),
        h2("Attendees"),
        tasks(
          { text: "Name — Role" },
          { text: "Name — Role" },
          { text: "Name — Role" },
        ),
        h2("Agenda"),
        table(
          ["#", "Topic", "Owner", "Time"],
          ["1", "Topic name", "@name", "10 min"],
          ["2", "Topic name", "@name", "15 min"],
          ["3", "Topic name", "@name", "5 min"],
        ),
        h2("Discussion Notes"),
        h3("Topic 1"),
        bullet("Key point discussed", "Decision made"),
        h3("Topic 2"),
        bullet("Key point discussed", "Follow-up needed"),
        h2("Decisions Made"),
        numbered("Decision 1 — Rationale", "Decision 2 — Rationale"),
        h2("Action Items"),
        tasks(
          { text: "Action item — @owner — Due: date" },
          { text: "Action item — @owner — Due: date" },
          { text: "Action item — @owner — Due: date" },
        ),
        h2("Next Meeting"),
        bold("Date: ", ""),
        bold("Agenda preview: ", ""),
      ],
    },
  },
  {
    id: "project-brief",
    title: "Project Brief",
    description: "Goals, scope, milestones & stakeholders",
    icon: "Target",
    category: "work",
    color: "#f59e0b",
    preview: ["Overview", "Goals", "Timeline", "Stakeholders"],
    content: {
      type: "doc",
      content: [
        h1("Project Brief"),
        table(
          ["Field", "Details"],
          ["Project Name", ""],
          ["Status", "🟡 Draft"],
          ["Owner", ""],
          ["Start Date", ""],
          ["Target Launch", ""],
        ),
        hr(),
        h2("Overview"),
        p("A brief description of what this project is and why it matters."),
        h2("Problem Statement"),
        p("What problem are we solving? Who is affected?"),
        h2("Goals & Success Metrics"),
        table(
          ["Goal", "Metric", "Target"],
          ["Primary goal", "KPI name", "X%"],
          ["Secondary goal", "KPI name", "X%"],
        ),
        h2("Scope"),
        h3("In Scope"),
        tasks(
          { text: "Feature or deliverable A" },
          { text: "Feature or deliverable B" },
          { text: "Feature or deliverable C" },
        ),
        h3("Out of Scope"),
        bullet("Explicitly not doing X", "Explicitly not doing Y"),
        h2("Timeline & Milestones"),
        table(
          ["Phase", "Milestone", "Date", "Owner"],
          ["Discovery", "Research complete", "Week 1–2", "@name"],
          ["Design", "Specs approved", "Week 3–4", "@name"],
          ["Build", "MVP ready", "Week 5–8", "@name"],
          ["Launch", "GA release", "Week 9", "@name"],
        ),
        h2("Stakeholders"),
        table(
          ["Name", "Role", "Responsibility"],
          ["@name", "Engineering Lead", "Technical execution"],
          ["@name", "Design Lead", "UX/UI"],
          ["@name", "Product Manager", "Requirements & priorities"],
        ),
        h2("Risks & Mitigations"),
        table(
          ["Risk", "Impact", "Likelihood", "Mitigation"],
          ["Risk description", "High", "Medium", "Plan to address"],
        ),
        h2("Open Questions"),
        tasks(
          { text: "Question 1?" },
          { text: "Question 2?" },
        ),
      ],
    },
  },
  {
    id: "weekly-standup",
    title: "Weekly Status Update",
    description: "Shipped, in progress, next week & blockers",
    icon: "CalendarCheck",
    category: "work",
    color: "#10b981",
    preview: ["Completed", "In Progress", "Next Week", "Blockers"],
    content: {
      type: "doc",
      content: [
        h1("Weekly Status Update"),
        table(
          ["Field", "Details"],
          ["Week of", new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
          ["Team", ""],
          ["Author", ""],
        ),
        hr(),
        h2("✅ Completed This Week"),
        tasks(
          { text: "Shipped feature X", checked: true },
          { text: "Fixed bug Y", checked: true },
          { text: "Reviewed PR Z", checked: true },
        ),
        h2("🔄 In Progress"),
        table(
          ["Task", "Owner", "Status", "ETA"],
          ["Task name", "@name", "70%", "Thu"],
          ["Task name", "@name", "30%", "Fri"],
        ),
        h2("📋 Plan for Next Week"),
        tasks(
          { text: "Priority 1" },
          { text: "Priority 2" },
          { text: "Priority 3" },
        ),
        h2("🚧 Blockers"),
        bullet("Waiting on review from @name", "Dependency on team X"),
        h2("📊 Key Metrics"),
        table(
          ["Metric", "Last Week", "This Week", "Trend"],
          ["Metric A", "—", "—", "—"],
          ["Metric B", "—", "—", "—"],
        ),
        h2("Notes"),
        pEmpty(),
      ],
    },
  },
  {
    id: "one-on-one",
    title: "1:1 Meeting",
    description: "Talking points, feedback & action items",
    icon: "MessageCircle",
    category: "work",
    color: "#ec4899",
    preview: ["Check-in", "Talking Points", "Feedback", "Actions"],
    content: {
      type: "doc",
      content: [
        h1("1:1 Meeting"),
        table(
          ["Field", "Details"],
          ["Date", new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
          ["Manager", ""],
          ["Report", ""],
        ),
        hr(),
        h2("Check-in"),
        bold("How are you feeling? ", "(1–5): "),
        bold("Energy level: ", ""),
        h2("Talking Points"),
        h3("From Report"),
        bullet("Topic 1", "Topic 2"),
        h3("From Manager"),
        bullet("Topic 1", "Topic 2"),
        h2("Updates & Progress"),
        p("What have you been working on since our last 1:1?"),
        pEmpty(),
        h2("Wins"),
        bullet("Win 1", "Win 2"),
        h2("Challenges"),
        bullet("Challenge 1 — How can I help?"),
        h2("Feedback"),
        h3("For Report"),
        p(""),
        h3("For Manager"),
        p("Anything I can do differently?"),
        h2("Career & Growth"),
        p("Any skills you want to develop? Goals to discuss?"),
        pEmpty(),
        h2("Action Items"),
        tasks(
          { text: "Action — @owner — Due: date" },
          { text: "Action — @owner — Due: date" },
        ),
      ],
    },
  },

  // ── Engineering ──
  {
    id: "bug-report",
    title: "Bug Report",
    description: "Reproduce, expected vs actual, environment",
    icon: "Bug",
    category: "engineering",
    color: "#ef4444",
    preview: ["Steps to Reproduce", "Expected", "Actual", "Environment"],
    content: {
      type: "doc",
      content: [
        h1("Bug Report"),
        table(
          ["Field", "Details"],
          ["Severity", "🔴 P1 / 🟡 P2 / 🟢 P3"],
          ["Status", "🟡 Open"],
          ["Reporter", ""],
          ["Assigned To", ""],
          ["Found In", "v1.0.0"],
          ["Fixed In", ""],
        ),
        hr(),
        h2("Summary"),
        p("One-line description of the bug."),
        h2("Steps to Reproduce"),
        numbered(
          "Go to …",
          "Click on …",
          "Enter …",
          "Observe …",
        ),
        h2("Expected Behavior"),
        p("What should happen."),
        h2("Actual Behavior"),
        p("What actually happens."),
        h2("Environment"),
        table(
          ["Property", "Value"],
          ["Browser", "Chrome 120"],
          ["OS", "macOS 15"],
          ["Device", "MacBook Pro"],
          ["Screen Size", "1440×900"],
          ["Network", "WiFi"],
        ),
        h2("Screenshots / Recordings"),
        p("Drag and drop screenshots here."),
        h2("Console Errors"),
        code("text", "Paste console output here..."),
        h2("Additional Context"),
        pEmpty(),
      ],
    },
  },
  {
    id: "technical-spec",
    title: "Technical Spec",
    description: "Architecture, APIs, data models & tradeoffs",
    icon: "FileCode",
    category: "engineering",
    color: "#8b5cf6",
    preview: ["Architecture", "API Design", "Data Model", "Tradeoffs"],
    content: {
      type: "doc",
      content: [
        h1("Technical Specification"),
        table(
          ["Field", "Details"],
          ["Author", ""],
          ["Status", "📝 Draft → 👀 Review → ✅ Approved"],
          ["Reviewers", ""],
          ["Related Docs", ""],
        ),
        hr(),
        h2("Context & Motivation"),
        p("Why are we building this? What problem does it solve?"),
        h2("Goals"),
        bullet("Goal 1", "Goal 2"),
        h2("Non-Goals"),
        bullet("Explicitly not solving X"),
        h2("Architecture Overview"),
        code("text", "┌──────────┐     ┌──────────┐     ┌──────────┐\n│  Client   │────▶│   API    │────▶│    DB    │\n└──────────┘     └──────────┘     └──────────┘"),
        p("Describe the high-level architecture here."),
        h2("API Design"),
        table(
          ["Method", "Endpoint", "Description", "Auth"],
          ["GET", "/api/resource", "List all resources", "Required"],
          ["POST", "/api/resource", "Create resource", "Required"],
          ["GET", "/api/resource/:id", "Get single resource", "Required"],
          ["PATCH", "/api/resource/:id", "Update resource", "Required"],
          ["DELETE", "/api/resource/:id", "Delete resource", "Admin"],
        ),
        h3("Request / Response Examples"),
        code("json", '// POST /api/resource\n{\n  "name": "Example",\n  "type": "widget"\n}\n\n// Response 201\n{\n  "id": "abc123",\n  "name": "Example",\n  "type": "widget",\n  "createdAt": "2026-03-13T00:00:00Z"\n}'),
        h2("Data Model"),
        code("typescript", "interface Resource {\n  id: string;\n  name: string;\n  type: string;\n  metadata: Record<string, unknown>;\n  createdAt: Date;\n  updatedAt: Date;\n}"),
        h2("Tradeoffs & Alternatives"),
        table(
          ["Approach", "Pros", "Cons", "Decision"],
          ["Option A", "Simple", "Limited", ""],
          ["Option B", "Flexible", "Complex", ""],
        ),
        h2("Security Considerations"),
        bullet("Authentication", "Authorization", "Data validation"),
        h2("Testing Strategy"),
        tasks(
          { text: "Unit tests for core logic" },
          { text: "Integration tests for API" },
          { text: "E2E test for critical path" },
        ),
        h2("Rollout Plan"),
        numbered("Deploy behind feature flag", "Internal dogfood", "10% rollout", "GA"),
        h2("Open Questions"),
        tasks(
          { text: "Question 1?" },
          { text: "Question 2?" },
        ),
      ],
    },
  },
  {
    id: "sprint-planning",
    title: "Sprint Planning",
    description: "Sprint goals, backlog, capacity & assignments",
    icon: "LayoutList",
    category: "engineering",
    color: "#06b6d4",
    preview: ["Sprint Goal", "Backlog", "Capacity", "Assignments"],
    content: {
      type: "doc",
      content: [
        h1("Sprint Planning"),
        table(
          ["Field", "Details"],
          ["Sprint", "Sprint #"],
          ["Duration", "2 weeks"],
          ["Start Date", ""],
          ["End Date", ""],
          ["Team", ""],
        ),
        hr(),
        h2("Sprint Goal"),
        p("What is the one thing we must accomplish this sprint?"),
        h2("Team Capacity"),
        table(
          ["Team Member", "Available Days", "Notes"],
          ["@name", "10", ""],
          ["@name", "8", "OOO Friday"],
          ["@name", "10", ""],
        ),
        h2("Sprint Backlog"),
        table(
          ["Ticket", "Title", "Points", "Assignee", "Priority"],
          ["PROJ-101", "Task title", "3", "@name", "🔴 High"],
          ["PROJ-102", "Task title", "2", "@name", "🟡 Medium"],
          ["PROJ-103", "Task title", "1", "@name", "🟢 Low"],
          ["PROJ-104", "Task title", "5", "@name", "🔴 High"],
        ),
        bold("Total Points: ", "11"),
        bold("Velocity (last 3 sprints avg): ", ""),
        h2("Carry-over from Last Sprint"),
        tasks(
          { text: "Item carried over — Reason" },
        ),
        h2("Risks & Dependencies"),
        bullet("Dependency on Team X for API", "Risk: scope may grow for PROJ-104"),
        h2("Definition of Done"),
        tasks(
          { text: "Code reviewed and approved" },
          { text: "Tests passing" },
          { text: "Documentation updated" },
          { text: "Deployed to staging" },
        ),
        h2("Retro Notes (from last sprint)"),
        h3("What went well"),
        bullet("Item"),
        h3("What to improve"),
        bullet("Item"),
      ],
    },
  },

  // ── Personal ──
  {
    id: "daily-journal",
    title: "Daily Journal",
    description: "Reflections, gratitude, goals & energy",
    icon: "BookOpen",
    category: "personal",
    color: "#f97316",
    preview: ["Morning", "Gratitude", "Reflections", "Tomorrow"],
    content: {
      type: "doc",
      content: [
        h1("Daily Journal"),
        bold("Date: ", new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })),
        bold("Mood: ", "😊 😐 😔 (circle one)"),
        bold("Energy: ", "⚡⚡⚡⚡⚡ (1–5)"),
        hr(),
        h2("🌅 Morning Intentions"),
        p("What do I want to accomplish today?"),
        numbered("Intention 1", "Intention 2", "Intention 3"),
        h2("🙏 Gratitude"),
        numbered("I'm grateful for…", "I'm grateful for…", "I'm grateful for…"),
        h2("✅ What I Got Done"),
        tasks(
          { text: "Task 1" },
          { text: "Task 2" },
          { text: "Task 3" },
        ),
        h2("🏆 Wins"),
        bullet("Something that went well"),
        h2("🚧 Challenges"),
        bullet("Something that was hard"),
        h2("💡 Learnings"),
        p("What did I learn today?"),
        pEmpty(),
        h2("📋 Tomorrow's Plan"),
        tasks(
          { text: "Priority 1" },
          { text: "Priority 2" },
          { text: "Priority 3" },
        ),
        h2("Free Thoughts"),
        pEmpty(),
      ],
    },
  },
  {
    id: "reading-notes",
    title: "Reading Notes",
    description: "Book or article notes with key takeaways",
    icon: "BookMarked",
    category: "personal",
    color: "#a855f7",
    preview: ["Summary", "Key Ideas", "Quotes", "Action Items"],
    content: {
      type: "doc",
      content: [
        h1("Reading Notes"),
        table(
          ["Field", "Details"],
          ["Title", ""],
          ["Author", ""],
          ["Type", "Book / Article / Paper"],
          ["Date Read", ""],
          ["Rating", "⭐⭐⭐⭐⭐"],
        ),
        hr(),
        h2("Summary"),
        p("What is this about in 2–3 sentences?"),
        pEmpty(),
        h2("Key Ideas"),
        numbered("Big idea 1", "Big idea 2", "Big idea 3"),
        h2("Detailed Notes"),
        h3("Chapter / Section 1"),
        bullet("Note", "Note"),
        h3("Chapter / Section 2"),
        bullet("Note", "Note"),
        h2("Favorite Quotes"),
        { type: "blockquote", content: [p('"Quote goes here." — Author')] },
        { type: "blockquote", content: [p('"Another quote." — Author')] },
        h2("How This Applies to Me"),
        p("What can I use from this?"),
        pEmpty(),
        h2("Action Items"),
        tasks(
          { text: "Apply idea X to my work" },
          { text: "Share insight Y with team" },
        ),
        h2("Related Reading"),
        bullet("Book / article 1", "Book / article 2"),
      ],
    },
  },

  // ── Design ──
  {
    id: "design-brief",
    title: "Design Brief",
    description: "Problem, users, requirements & constraints",
    icon: "Palette",
    category: "design",
    color: "#ec4899",
    preview: ["Problem", "Users", "Requirements", "Constraints"],
    content: {
      type: "doc",
      content: [
        h1("Design Brief"),
        table(
          ["Field", "Details"],
          ["Project", ""],
          ["Designer", ""],
          ["Status", "📝 Brief → 🎨 Exploration → ✅ Final"],
          ["Due Date", ""],
        ),
        hr(),
        h2("Problem Statement"),
        p("What user problem are we solving?"),
        h2("Target Users"),
        table(
          ["Persona", "Description", "Key Need"],
          ["Persona A", "Description", "What they need"],
          ["Persona B", "Description", "What they need"],
        ),
        h2("User Stories"),
        bullet(
          "As a [user], I want to [action] so that [benefit]",
          "As a [user], I want to [action] so that [benefit]",
        ),
        h2("Requirements"),
        h3("Must Have"),
        tasks(
          { text: "Requirement 1" },
          { text: "Requirement 2" },
        ),
        h3("Nice to Have"),
        tasks(
          { text: "Requirement 3" },
        ),
        h2("Constraints"),
        bullet("Technical constraint", "Brand constraint", "Timeline constraint"),
        h2("Inspiration & References"),
        p("Links or descriptions of reference designs."),
        pEmpty(),
        h2("Design Deliverables"),
        tasks(
          { text: "Wireframes" },
          { text: "High-fidelity mockups" },
          { text: "Prototype" },
          { text: "Design specs / handoff" },
        ),
        h2("Feedback & Approvals"),
        table(
          ["Round", "Date", "Reviewer", "Status"],
          ["Round 1", "", "@name", "Pending"],
          ["Round 2", "", "@name", "Pending"],
        ),
      ],
    },
  },
  {
    id: "user-research",
    title: "User Research Plan",
    description: "Research goals, methodology & findings",
    icon: "Search",
    category: "design",
    color: "#14b8a6",
    preview: ["Goals", "Methodology", "Participants", "Findings"],
    content: {
      type: "doc",
      content: [
        h1("User Research Plan"),
        table(
          ["Field", "Details"],
          ["Project", ""],
          ["Researcher", ""],
          ["Method", "Interviews / Surveys / Usability Testing"],
          ["Timeline", ""],
        ),
        hr(),
        h2("Research Goals"),
        numbered("What do we want to learn?", "What decisions will this inform?"),
        h2("Hypotheses"),
        bullet("We believe that…", "We expect users to…"),
        h2("Methodology"),
        p("Describe the research approach."),
        h2("Participant Criteria"),
        table(
          ["Criteria", "Details"],
          ["User type", ""],
          ["Experience level", ""],
          ["Sample size", "5–8 participants"],
          ["Recruitment", ""],
        ),
        h2("Discussion Guide / Script"),
        h3("Intro (2 min)"),
        p("Introduce yourself and the purpose of the session."),
        h3("Warm-up Questions (5 min)"),
        numbered("Tell me about your role", "How do you currently do X?"),
        h3("Core Tasks (20 min)"),
        numbered("Task 1: Try to do X", "Task 2: Try to do Y"),
        h3("Wrap-up (5 min)"),
        numbered("What was most confusing?", "What would you change?", "Any other feedback?"),
        h2("Findings"),
        table(
          ["Theme", "Frequency", "Severity", "Quote"],
          ["Finding 1", "4/6", "High", '"Quote"'],
          ["Finding 2", "3/6", "Medium", '"Quote"'],
        ),
        h2("Recommendations"),
        tasks(
          { text: "Recommendation based on finding 1" },
          { text: "Recommendation based on finding 2" },
        ),
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
