"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { SlashCommandItem, filterSlashCommands } from "./slash-command";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Info,
  ImageIcon,
  Minus,
  CheckSquare,
  Table,
  ChevronRight,
  Highlighter,
  Sparkles,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Sigma,
  GitBranch,
  Columns2,
  Columns3,
  Smile,
  Calendar,
  Music,
  Film,
  FileText,
  AtSign,
  LayoutTemplate,
  Palette,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  Table,
  ChevronRight,
  Highlighter,
  Code,
  Code2,
  Info,
  ImageIcon,
  Minus,
  Sparkles,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Sigma,
  GitBranch,
  Columns2,
  Columns3,
  Smile,
  Calendar,
  Music,
  Film,
  FileText,
  AtSign,
  LayoutTemplate,
  Palette,
};

const CATEGORY_LABELS: Record<string, string> = {
  text: "Text",
  lists: "Lists",
  blocks: "Blocks",
  media: "Media",
  advanced: "Advanced",
  inline: "Inline",
  color: "Colors",
};

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="z-50 w-72 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black p-4 shadow-lg animate-fade-in-up">
        <p className="text-xs text-black/30 dark:text-white/30 text-center">No matching commands</p>
      </div>
    );
  }

  // Group items by category, preserving order
  const grouped: { category: string; items: { item: SlashCommandItem; globalIndex: number }[] }[] = [];
  let lastCategory = "";
  items.forEach((item, index) => {
    const cat = item.category ?? "blocks";
    if (cat !== lastCategory) {
      grouped.push({ category: cat, items: [] });
      lastCategory = cat;
    }
    grouped[grouped.length - 1].items.push({ item, globalIndex: index });
  });

  return (
    <div className="z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black p-1.5 shadow-lg animate-fade-in-up">
      {grouped.map((group) => (
        <div key={group.category}>
          <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
            {CATEGORY_LABELS[group.category] ?? group.category}
          </p>
          {group.items.map(({ item, globalIndex }) => {
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.title}
                onClick={() => command(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                  globalIndex === selectedIndex
                    ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                    : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                {Icon && (
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      globalIndex === selectedIndex
                        ? "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white"
                        : "bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-[10px] text-black/40 dark:text-white/40">
                    {item.description}
                  </p>
                </div>
                {item.shortcut && (
                  <span className="shrink-0 text-[10px] text-black/20 dark:text-white/20">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

export { filterSlashCommands };
