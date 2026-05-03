"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Table2, LayoutGrid, Calendar, List as ListIcon, Image } from "lucide-react";
import type { Database, DBRow, DBView } from "./types";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { PropertyEditor } from "./PropertyEditor";

interface DatabaseViewProps {
  databaseId: string;
}

const VIEW_ICONS: Record<string, any> = {
  table: Table2,
  board: LayoutGrid,
  calendar: Calendar,
  list: ListIcon,
  gallery: Image,
};

export function DatabaseRoot({ databaseId }: DatabaseViewProps) {
  const [database, setDatabase] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [titleEdit, setTitleEdit] = useState("");

  const fetchDatabase = useCallback(async () => {
    try {
      const res = await fetch(`/api/databases/${databaseId}`);
      if (res.ok) {
        const data = await res.json();
        setDatabase(data);
        setTitleEdit(data.title);
        if (!activeViewId && data.views.length > 0) {
          setActiveViewId(data.views[0].id);
        }
      }
    } catch {}
    setLoading(false);
  }, [databaseId, activeViewId]);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  const updateTitle = useCallback(async (newTitle: string) => {
    if (!database || newTitle === database.title) return;
    try {
      await fetch(`/api/databases/${databaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setDatabase((prev) => (prev ? { ...prev, title: newTitle } : prev));
    } catch {}
  }, [database, databaseId]);

  const handleAddRow = useCallback(
    async (defaults?: Record<string, any>) => {
      if (!database) return;
      try {
        const res = await fetch(`/api/databases/${databaseId}/rows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: defaults ?? {} }),
        });
        if (res.ok) {
          const row = await res.json();
          setDatabase((prev) =>
            prev ? { ...prev, rows: [...prev.rows, row] } : prev
          );
        }
      } catch {}
    },
    [database, databaseId]
  );

  const handleUpdateRow = useCallback(
    async (rowId: string, values: Record<string, any>) => {
      // Optimistic update
      setDatabase((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) => (r.id === rowId ? { ...r, values } : r)),
        };
      });
      try {
        await fetch(`/api/databases/${databaseId}/rows`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId, values }),
        });
      } catch {}
    },
    [databaseId]
  );

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      setDatabase((prev) => {
        if (!prev) return prev;
        return { ...prev, rows: prev.rows.filter((r) => r.id !== rowId) };
      });
      try {
        await fetch(`/api/databases/${databaseId}/rows?rowId=${rowId}`, {
          method: "DELETE",
        });
      } catch {}
    },
    [databaseId]
  );

  const handleAddProperty = useCallback(
    async (type: string) => {
      if (!database) return;
      const name =
        type === "select" || type === "status"
          ? `${type.charAt(0).toUpperCase() + type.slice(1)}`
          : type === "multi_select"
            ? "Tags"
            : type.charAt(0).toUpperCase() + type.slice(1);

      const config =
        type === "select" || type === "status" || type === "multi_select"
          ? {
              options: [
                { id: `opt_${Date.now()}_a`, label: "Option A", color: "#6366f1" },
                { id: `opt_${Date.now()}_b`, label: "Option B", color: "#22c55e" },
              ],
            }
          : {};

      try {
        const res = await fetch(`/api/databases/${databaseId}/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, name, config }),
        });
        if (res.ok) {
          const property = await res.json();
          setDatabase((prev) =>
            prev ? { ...prev, properties: [...prev.properties, property] } : prev
          );
        }
      } catch {}
    },
    [database, databaseId]
  );

  const handleAddView = useCallback(
    async (type: string) => {
      if (!database) return;
      try {
        const res = await fetch(`/api/databases/${databaseId}/views`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: type.charAt(0).toUpperCase() + type.slice(1),
            config: {},
          }),
        });
        if (res.ok) {
          const view = await res.json();
          setDatabase((prev) =>
            prev ? { ...prev, views: [...prev.views, view] } : prev
          );
          setActiveViewId(view.id);
        }
      } catch {}
    },
    [database, databaseId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-black/30 dark:text-white/30" />
      </div>
    );
  }

  if (!database) {
    return (
      <p className="text-sm text-black/40 dark:text-white/40 text-center py-8">
        Database not found.
      </p>
    );
  }

  const activeView = database.views.find((v) => v.id === activeViewId) ?? database.views[0];

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/6 dark:border-white/8 bg-black/[0.015] dark:bg-white/[0.015]">
        <input
          value={titleEdit}
          onChange={(e) => setTitleEdit(e.target.value)}
          onBlur={() => updateTitle(titleEdit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="text-sm font-semibold text-black dark:text-white bg-transparent outline-none flex-1"
        />
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-black/6 dark:border-white/8 overflow-x-auto">
        {database.views.map((view) => {
          const Icon = VIEW_ICONS[view.type] || Table2;
          const isActive = view.id === activeView?.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveViewId(view.id)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
                isActive
                  ? "bg-black/[0.06] dark:bg-white/[0.06] text-black dark:text-white font-medium"
                  : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
              }`}
            >
              <Icon className="h-3 w-3" />
              {view.name}
            </button>
          );
        })}

        <AddViewButton onAdd={handleAddView} existingTypes={database.views.map((v) => v.type)} />
      </div>

      {/* Active view */}
      <div className="min-h-[200px]">
        {activeView?.type === "board" ? (
          <BoardView
            database={database}
            onAddRow={handleAddRow}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
          />
        ) : activeView?.type === "calendar" ? (
          <CalendarView database={database} onAddRow={handleAddRow} onUpdateRow={handleUpdateRow} />
        ) : activeView?.type === "gallery" ? (
          <GalleryView database={database} onUpdateRow={handleUpdateRow} onDeleteRow={handleDeleteRow} />
        ) : activeView?.type === "list" ? (
          <ListView database={database} onUpdateRow={handleUpdateRow} onDeleteRow={handleDeleteRow} />
        ) : (
          <TableView
            database={database}
            onAddRow={() => handleAddRow()}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onAddProperty={handleAddProperty}
          />
        )}
      </div>
    </div>
  );
}

function AddViewButton({
  onAdd,
  existingTypes,
}: {
  onAdd: (type: string) => void;
  existingTypes: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const types = [
    { id: "table", label: "Table", icon: Table2 },
    { id: "board", label: "Board", icon: LayoutGrid },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "list", label: "List", icon: ListIcon },
  ];

  return (
    <div ref={wrapRef} className="relative ml-auto">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-black/30 dark:text-white/30 hover:text-black/70 dark:hover:text-white/70 transition-colors"
      >
        + View
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 min-w-[140px] rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-xl py-1">
          {types.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onAdd(t.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarView({
  database,
  onAddRow,
  onUpdateRow,
}: {
  database: Database;
  onAddRow: (defaults?: Record<string, any>) => void;
  onUpdateRow: (rowId: string, values: Record<string, any>) => void;
}) {
  const dateProperty = database.properties.find((p) => p.type === "date");
  const titleProperty = database.properties.find((p) => p.type === "title");

  if (!dateProperty) {
    return (
      <div className="p-8 text-center text-sm text-black/40 dark:text-white/40">
        Add a date property to use the calendar view.
      </div>
    );
  }

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ date: Date; rows: typeof database.rows } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const rowsOnDate = database.rows.filter((row) => {
      const v = row.values?.[dateProperty.id];
      if (!v) return false;
      const rowDate = new Date(v);
      return (
        rowDate.getFullYear() === date.getFullYear() &&
        rowDate.getMonth() === date.getMonth() &&
        rowDate.getDate() === date.getDate()
      );
    });
    cells.push({ date, rows: rowsOnDate });
  }

  const monthName = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-black dark:text-white">{monthName}</h3>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => {
              if (month === 0) {
                setMonth(11);
                setYear(year - 1);
              } else {
                setMonth(month - 1);
              }
            }}
            className="px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
          >
            ←
          </button>
          <button
            onClick={() => {
              setMonth(today.getMonth());
              setYear(today.getFullYear());
            }}
            className="px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
          >
            Today
          </button>
          <button
            onClick={() => {
              if (month === 11) {
                setMonth(0);
                setYear(year + 1);
              } else {
                setMonth(month + 1);
              }
            }}
            className="px-2 py-1 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-black/8 dark:bg-white/8 rounded-lg overflow-hidden border border-black/8 dark:border-white/10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-black/[0.02] dark:bg-white/[0.02] px-2 py-1.5 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0a0a0a] min-h-[80px] p-1.5 text-xs"
          >
            {cell && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-black/50 dark:text-white/50">
                    {cell.date.getDate()}
                  </span>
                  <button
                    onClick={() => {
                      const iso = cell.date.toISOString().slice(0, 10);
                      onAddRow({ [dateProperty.id]: iso });
                    }}
                    className="opacity-0 hover:opacity-100 text-black/30 dark:text-white/30 text-[10px]"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-1">
                  {cell.rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded px-1.5 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 truncate"
                    >
                      {titleProperty
                        ? row.values?.[titleProperty.id] || "Untitled"
                        : "Row"}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryView({
  database,
  onUpdateRow,
  onDeleteRow,
}: {
  database: Database;
  onUpdateRow: (rowId: string, values: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const titleProperty = database.properties.find((p) => p.type === "title");

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {database.rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] overflow-hidden hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          <div className="aspect-video bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
          <div className="p-3">
            {titleProperty && (
              <PropertyEditor
                property={titleProperty}
                value={row.values?.[titleProperty.id]}
                onChange={(v) => onUpdateRow(row.id, { ...row.values, [titleProperty.id]: v })}
                className="font-medium"
              />
            )}
            <div className="mt-2 space-y-1">
              {database.properties
                .filter((p) => p.id !== titleProperty?.id)
                .slice(0, 3)
                .map((prop) => (
                  <div key={prop.id} className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 w-16 shrink-0">
                      {prop.name}
                    </span>
                    <div className="flex-1 min-w-0">
                      <PropertyEditor
                        property={prop}
                        value={row.values?.[prop.id]}
                        onChange={(v) => onUpdateRow(row.id, { ...row.values, [prop.id]: v })}
                        inline
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}
      {database.rows.length === 0 && (
        <p className="col-span-full text-center text-sm text-black/40 dark:text-white/40 py-8">
          No items yet
        </p>
      )}
    </div>
  );
}

function ListView({
  database,
  onUpdateRow,
  onDeleteRow,
}: {
  database: Database;
  onUpdateRow: (rowId: string, values: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const titleProperty = database.properties.find((p) => p.type === "title");
  return (
    <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
      {database.rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-4 px-4 py-2.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
        >
          {titleProperty && (
            <div className="flex-1 min-w-0">
              <PropertyEditor
                property={titleProperty}
                value={row.values?.[titleProperty.id]}
                onChange={(v) => onUpdateRow(row.id, { ...row.values, [titleProperty.id]: v })}
                className="font-medium"
              />
            </div>
          )}
          {database.properties
            .filter((p) => p.id !== titleProperty?.id)
            .slice(0, 3)
            .map((prop) => (
              <div key={prop.id} className="w-32 shrink-0">
                <PropertyEditor
                  property={prop}
                  value={row.values?.[prop.id]}
                  onChange={(v) => onUpdateRow(row.id, { ...row.values, [prop.id]: v })}
                  inline
                />
              </div>
            ))}
        </div>
      ))}
      {database.rows.length === 0 && (
        <p className="text-center text-sm text-black/40 dark:text-white/40 py-8">No items yet</p>
      )}
    </div>
  );
}
