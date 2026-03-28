"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DailyNotesProps {
  workspaceId: string;
  documents: { id: string; title: string }[];
  onSelectDocument: (id: string) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDateTitle(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DailyNotes({
  workspaceId,
  documents,
  onSelectDocument,
}: DailyNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Find which days have daily notes by matching title format
  const daysWithNotes = new Set<number>();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);

  for (const doc of documents) {
    // Try to parse the title as a date
    const parsed = new Date(doc.title.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*/, ""));
    if (
      !isNaN(parsed.getTime()) &&
      parsed.getFullYear() === viewYear &&
      parsed.getMonth() === viewMonth
    ) {
      daysWithNotes.add(parsed.getDate());
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const openDailyNote = useCallback(
    async (date: Date) => {
      const title = formatDateTitle(date);

      // Check if doc exists locally
      const existing = documents.find((d) => d.title === title);
      if (existing) {
        onSelectDocument(existing.id);
        return;
      }

      // Create via API
      setLoading(true);
      try {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const res = await fetch(
          `/api/documents/daily-note?workspaceId=${workspaceId}&date=${dateStr}`
        );
        if (res.ok) {
          const doc = await res.json();
          onSelectDocument(doc.id);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, documents, onSelectDocument]
  );

  // Generate calendar grid
  const firstDayOfWeek = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="px-3 pb-2">
      {/* Quick "Today" button when collapsed */}
      {!expanded && (
        <button
          onClick={() => openDailyNote(today)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 hover:bg-black/[0.06] dark:hover:border-white/25 dark:hover:bg-white/[0.07] transition-all"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Today
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="ml-auto text-[10px] text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50"
          >
            Calendar
          </button>
        </button>
      )}

      {/* Expanded mini-calendar */}
      {expanded && (
        <div className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-black/40 dark:text-white/40"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-[11px] font-medium text-black/60 dark:text-white/60">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={nextMonth}
                className="p-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-black/40 dark:text-white/40"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 ml-1"
              >
                Hide
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_LABELS.map((d) => (
              <span
                key={d}
                className="text-center text-[9px] font-medium text-black/25 dark:text-white/25"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) =>
              day === null ? (
                <span key={`empty-${i}`} />
              ) : (
                <button
                  key={day}
                  onClick={() =>
                    openDailyNote(new Date(viewYear, viewMonth, day))
                  }
                  disabled={loading}
                  className={`relative flex items-center justify-center h-6 w-6 mx-auto rounded text-[11px] transition-all ${
                    isToday(day)
                      ? "bg-black dark:bg-white text-white dark:text-black font-bold"
                      : daysWithNotes.has(day)
                        ? "text-black/80 dark:text-white/80 font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
                        : "text-black/40 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {day}
                  {daysWithNotes.has(day) && !isToday(day) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black/30 dark:bg-white/30" />
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
