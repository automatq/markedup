"use client";

import React, { useEffect, useRef } from "react";
import {
  Copy,
  FileText,
  FilePlus2,
  FolderInput,
  Trash2,
  Presentation,
  Type,
  Maximize2,
  Palette,
  Lock,
  MessageSquareDiff,
  Import,
  Download,
  BookOpen,
  Bell,
  BarChart3,
  History,
  Plug,
  Sparkles,
  Globe,
  FileStack,
  List as ListIcon,
  ArrowUpLeft as ArrowUpLeftIcon,
} from "lucide-react";

interface PageActionsMenuProps {
  open: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  action: string;
  shortcut?: string;
  danger?: boolean;
  dividerAfter?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: Copy, label: "Copy link", action: "copy-link" },
  { icon: FileText, label: "Copy page contents", action: "copy-contents" },
  { icon: FilePlus2, label: "Duplicate page", action: "duplicate", dividerAfter: true },
  { icon: FolderInput, label: "Move to…", action: "move-to" },
  { icon: Trash2, label: "Move to trash", action: "trash", danger: true, dividerAfter: true },
  { icon: Presentation, label: "Present", action: "present" },
  { icon: Type, label: "Small text", action: "small-text" },
  { icon: Maximize2, label: "Change layout", action: "full-width" },
  { icon: Palette, label: "Customize page", action: "customize", dividerAfter: true },
  { icon: Lock, label: "Lock page", action: "lock" },
  { icon: MessageSquareDiff, label: "Suggest edits", action: "suggest-edits", dividerAfter: true },
  { icon: Import, label: "Import", action: "import" },
  { icon: Download, label: "Export as Markdown", action: "export" },
  { icon: Download, label: "Export as PDF", action: "export-pdf" },
  { icon: Download, label: "Export as Word", action: "export-docx", dividerAfter: true },
  { icon: BookOpen, label: "Turn into wiki", action: "turn-wiki" },
  { icon: BarChart3, label: "Updates & analytics", action: "analytics" },
  { icon: History, label: "Version history", action: "version-history" },
  { icon: Bell, label: "Notify me", action: "notify" },
  { icon: Plug, label: "Connections", action: "connections" },
  { icon: ListIcon, label: "Outline", action: "outline" },
  { icon: ArrowUpLeftIcon, label: "Backlinks", action: "backlinks", dividerAfter: true },
  { icon: Sparkles, label: "AI Agents", action: "agents" },
  { icon: FileStack, label: "Breakout Files", action: "breakouts" },
  { icon: ListIcon, label: "Execution Plan", action: "execution-plan" },
  { icon: Globe, label: "Publish to web", action: "publish" },
];

export function PageActionsMenu({ open, onClose, onAction }: PageActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up overflow-hidden"
    >
      <div className="max-h-[70vh] overflow-y-auto py-1.5">
        {menuItems.map((item) => (
          <React.Fragment key={item.action}>
            <button
              onClick={() => {
                onAction(item.action);
                onClose();
              }}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                item.danger
                  ? "text-red-500 dark:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-400/5"
                  : "text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <kbd className="text-[10px] text-black/25 dark:text-white/25">
                  {item.shortcut}
                </kbd>
              )}
            </button>
            {item.dividerAfter && (
              <div className="my-1 border-t border-black/6 dark:border-white/8" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
