"use client";

import React from "react";
import { X, Plug, ExternalLink } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  url: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    icon: "#",
    description: "Post updates to a Slack channel",
    url: "https://api.slack.com/apps",
  },
  {
    id: "github",
    name: "GitHub",
    icon: "GH",
    description: "Link PRs and issues",
    url: "https://github.com/settings/applications",
  },
  {
    id: "linear",
    name: "Linear",
    icon: "LN",
    description: "Sync tasks and issues",
    url: "https://linear.app/settings/integrations",
  },
  {
    id: "figma",
    name: "Figma",
    icon: "FG",
    description: "Embed design files",
    url: "https://www.figma.com/developers",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: "GD",
    description: "Attach files from Drive",
    url: "https://console.cloud.google.com/apis",
  },
  {
    id: "notion",
    name: "Notion",
    icon: "N",
    description: "Import pages from Notion",
    url: "https://www.notion.so/my-integrations",
  },
  {
    id: "jira",
    name: "Jira",
    icon: "JR",
    description: "Link Jira tickets",
    url: "https://developer.atlassian.com/console/myapps/",
  },
  {
    id: "zapier",
    name: "Zapier",
    icon: "ZP",
    description: "Automate workflows",
    url: "https://zapier.com/app/connections",
  },
];

interface ConnectionsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectionsPanel({ open, onClose }: ConnectionsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Connections
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs text-black/50 dark:text-white/50 mb-4">
              Connect third-party services to extend MarkedUp. Integrations are
              coming soon — visit the links below to stay updated.
            </p>

            <div className="space-y-1.5">
              {INTEGRATIONS.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-3 py-2.5 text-left transition-all hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-[10px] font-bold text-black/40 dark:text-white/40">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black/70 dark:text-white/70 group-hover:text-black dark:group-hover:text-white">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-black/30 dark:text-white/30 truncate">
                      {item.description}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-black/15 dark:text-white/15 group-hover:text-black/40 dark:group-hover:text-white/40 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
