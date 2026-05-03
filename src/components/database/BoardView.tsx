"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Database, DBRow, SelectOption } from "./types";
import { PropertyEditor } from "./PropertyEditor";

interface BoardViewProps {
  database: Database;
  onAddRow: (defaults?: Record<string, any>) => void;
  onUpdateRow: (rowId: string, values: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
}

export function BoardView({ database, onAddRow, onUpdateRow, onDeleteRow }: BoardViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Find the property to group by — first status or select column
  const groupProperty = useMemo(
    () =>
      database.properties.find((p) => p.type === "status") ||
      database.properties.find((p) => p.type === "select"),
    [database.properties]
  );

  const titleProperty = useMemo(
    () => database.properties.find((p) => p.type === "title"),
    [database.properties]
  );

  if (!groupProperty) {
    return (
      <div className="p-8 text-center text-sm text-black/40 dark:text-white/40">
        Add a status or select property to use the board view.
      </div>
    );
  }

  const options = (groupProperty.config?.options ?? []) as SelectOption[];
  const columns = [
    ...options,
    { id: "__unassigned__", label: "Uncategorized", color: "#737373" } as SelectOption,
  ];

  const rowsByGroup = useMemo(() => {
    const map = new Map<string, DBRow[]>();
    for (const col of columns) map.set(col.id, []);
    for (const row of database.rows) {
      const v = row.values?.[groupProperty.id];
      const key = v && map.has(v) ? v : "__unassigned__";
      map.get(key)?.push(row);
    }
    return map;
  }, [columns, database.rows, groupProperty.id]);

  const handleDrop = useCallback(
    (columnId: string) => {
      if (!draggingId) return;
      const row = database.rows.find((r) => r.id === draggingId);
      if (!row) return;
      const newValue = columnId === "__unassigned__" ? null : columnId;
      const current = row.values?.[groupProperty.id] ?? null;
      if (newValue !== current) {
        onUpdateRow(row.id, { ...row.values, [groupProperty.id]: newValue });
      }
      setDraggingId(null);
    },
    [draggingId, database.rows, groupProperty.id, onUpdateRow]
  );

  return (
    <div className="overflow-x-auto p-4">
      <div className="flex gap-3 min-w-min">
        {columns.map((col) => {
          const rows = rowsByGroup.get(col.id) ?? [];
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (draggingId) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.id);
              }}
              className="w-72 shrink-0 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] flex flex-col max-h-[70vh]"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: `${col.color}1a`, color: col.color }}
                  >
                    {col.label}
                  </span>
                  <span className="text-[10px] text-black/30 dark:text-white/30">{rows.length}</span>
                </div>
                <button
                  onClick={() => {
                    const defaults: Record<string, any> = {};
                    if (col.id !== "__unassigned__") defaults[groupProperty.id] = col.id;
                    onAddRow(defaults);
                  }}
                  className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                  title="Add card"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingId(row.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={`group rounded-lg bg-white dark:bg-[#0a0a0a] border border-black/[0.04] dark:border-white/[0.04] p-2.5 cursor-grab active:cursor-grabbing transition-all ${
                      draggingId === row.id ? "opacity-40" : "hover:border-black/15 dark:hover:border-white/15"
                    }`}
                  >
                    {titleProperty && (
                      <div className="mb-1.5">
                        <PropertyEditor
                          property={titleProperty}
                          value={row.values?.[titleProperty.id]}
                          onChange={(v) => onUpdateRow(row.id, { ...row.values, [titleProperty.id]: v })}
                          className="font-medium"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      {database.properties
                        .filter((p) => p.id !== groupProperty.id && p.id !== titleProperty?.id)
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
                    <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="text-black/25 dark:text-white/25 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <p className="text-[11px] text-black/25 dark:text-white/25 text-center py-3">
                    Drop cards here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
