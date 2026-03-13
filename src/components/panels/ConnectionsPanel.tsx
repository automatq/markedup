"use client";

import React, { useState } from "react";
import { X, Plug, Plus, ExternalLink, Trash2, Check } from "lucide-react";

interface Connection {
  id: string;
  name: string;
  type: string;
  icon: string;
  connected: boolean;
  description: string;
}

const AVAILABLE_CONNECTIONS: Connection[] = [
  { id: "slack", name: "Slack", type: "messaging", icon: "#", connected: true, description: "Post updates to a Slack channel" },
  { id: "github", name: "GitHub", type: "development", icon: "GH", connected: true, description: "Link PRs and issues" },
  { id: "linear", name: "Linear", type: "project-management", icon: "LN", connected: false, description: "Sync tasks and issues" },
  { id: "figma", name: "Figma", type: "design", icon: "FG", connected: false, description: "Embed design files" },
  { id: "google-drive", name: "Google Drive", type: "storage", icon: "GD", connected: false, description: "Attach files from Drive" },
  { id: "notion", name: "Notion", type: "import", icon: "N", connected: false, description: "Import pages from Notion" },
  { id: "jira", name: "Jira", type: "project-management", icon: "JR", connected: false, description: "Link Jira tickets" },
  { id: "zapier", name: "Zapier", type: "automation", icon: "ZP", connected: false, description: "Automate workflows" },
];

interface ConnectionsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectionsPanel({ open, onClose }: ConnectionsPanelProps) {
  const [connections, setConnections] = useState(AVAILABLE_CONNECTIONS);
  const [search, setSearch] = useState("");

  if (!open) return null;

  const connected = connections.filter((c) => c.connected);
  const available = connections
    .filter((c) => !c.connected)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleConnection = (id: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c))
    );
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Connections</h2>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Connected */}
          {connected.length > 0 && (
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
                Connected
              </p>
              <div className="space-y-1.5">
                {connected.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center gap-3 rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[10px] font-bold text-black/50 dark:text-white/50">
                      {conn.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white">{conn.name}</p>
                      <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" />
                        Connected
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConnection(conn.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-black/20 dark:text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Disconnect"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          <div className="px-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
              Available
            </p>
            <input
              placeholder="Search integrations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors mb-2"
            />
            <div className="space-y-1.5">
              {available.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => toggleConnection(conn.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-3 py-2.5 text-left transition-all hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[10px] font-bold text-black/40 dark:text-white/40">
                    {conn.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white">
                      {conn.name}
                    </p>
                    <p className="text-[10px] text-black/30 dark:text-white/30 truncate">
                      {conn.description}
                    </p>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-black/15 dark:text-white/15 group-hover:text-black/40 dark:group-hover:text-white/40 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
