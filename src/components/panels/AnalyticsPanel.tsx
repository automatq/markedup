"use client";

import React from "react";
import { X, BarChart3, Eye, Edit3, Clock, Users, TrendingUp } from "lucide-react";

interface AnalyticsPanelProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
}

interface StatCard {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  changeUp?: boolean;
}

const MOCK_STATS: StatCard[] = [
  { icon: Eye, label: "Total views", value: "142", change: "+12 this week", changeUp: true },
  { icon: Edit3, label: "Total edits", value: "38", change: "+5 this week", changeUp: true },
  { icon: Users, label: "Unique editors", value: "4" },
  { icon: Clock, label: "Avg. time on page", value: "3m 24s" },
];

interface ActivityEntry {
  author: string;
  authorColor: string;
  action: string;
  timestamp: Date;
}

const MOCK_ACTIVITY: ActivityEntry[] = [
  { author: "You", authorColor: "#6366f1", action: "edited the page", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { author: "Sarah K", authorColor: "#ec4899", action: "left a comment", timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { author: "James L", authorColor: "#10b981", action: "viewed the page", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { author: "You", authorColor: "#6366f1", action: "added a table", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { author: "Sarah K", authorColor: "#ec4899", action: "resolved a comment", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8) },
  { author: "James L", authorColor: "#10b981", action: "edited the page", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { author: "You", authorColor: "#6366f1", action: "created the page", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) },
];

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Simple bar chart using divs
function MiniBarChart() {
  const bars = [3, 5, 2, 8, 12, 7, 9];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-1 h-12">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-black/10 dark:bg-white/10 transition-all hover:bg-black/20 dark:hover:bg-white/20"
          style={{ height: `${(v / max) * 100}%` }}
          title={`Day ${i + 1}: ${v} views`}
        />
      ))}
    </div>
  );
}

export function AnalyticsPanel({ open, onClose, documentTitle }: AnalyticsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Analytics</h2>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 p-4">
            {MOCK_STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                <stat.icon className="h-3.5 w-3.5 text-black/30 dark:text-white/30 mb-1.5" />
                <p className="text-lg font-semibold text-black dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-black/40 dark:text-white/40">{stat.label}</p>
                {stat.change && (
                  <p className={`text-[9px] mt-1 flex items-center gap-0.5 ${stat.changeUp ? "text-emerald-500" : "text-red-400"}`}>
                    <TrendingUp className="h-2.5 w-2.5" />
                    {stat.change}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Views chart */}
          <div className="px-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
              Views — last 7 days
            </p>
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
              <MiniBarChart />
              <div className="flex justify-between mt-1.5 text-[9px] text-black/20 dark:text-white/20">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div className="px-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
              Recent activity
            </p>
            <div className="space-y-0">
              {MOCK_ACTIVITY.map((entry, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
                    style={{ backgroundColor: entry.authorColor }}
                  >
                    {entry.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-black/60 dark:text-white/60 truncate">
                      <span className="font-medium text-black/80 dark:text-white/80">{entry.author}</span>{" "}
                      {entry.action}
                    </p>
                  </div>
                  <span className="text-[9px] text-black/20 dark:text-white/20 shrink-0">{formatTime(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
