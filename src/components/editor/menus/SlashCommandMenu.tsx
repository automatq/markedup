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
  Info,
  ImageIcon,
  Minus,
  CheckSquare,
  Table,
  ChevronRight,
  Highlighter,
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
  Info,
  ImageIcon,
  Minus,
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

  if (!items.length) return null;

  return (
    <div className="z-50 w-72 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black p-1.5 shadow-lg animate-fade-in-up">
      {items.map((item, index) => {
        const Icon = iconMap[item.icon];
        return (
          <button
            key={item.title}
            onClick={() => command(item)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${
              index === selectedIndex
                ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            }`}
          >
            {Icon && (
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  index === selectedIndex
                    ? "bg-black/10 text-black/80 dark:bg-white/10 dark:text-white"
                    : "bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-[10px] text-black/40 dark:text-white/40">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

export { filterSlashCommands };
