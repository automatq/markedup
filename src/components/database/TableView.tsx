"use client";

import React, { useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { PropertyEditor } from "./PropertyEditor";
import type { Database, DBProperty, DBRow } from "./types";

interface TableViewProps {
  database: Database;
  onAddRow: () => void;
  onUpdateRow: (rowId: string, values: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddProperty: (type: string) => void;
}

export function TableView({
  database,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onAddProperty,
}: TableViewProps) {
  const updateValue = useCallback(
    (row: DBRow, propertyId: string, newValue: any) => {
      const next = { ...row.values, [propertyId]: newValue };
      onUpdateRow(row.id, next);
    },
    [onUpdateRow]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-8 text-left text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium border-b border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]" />
            {database.properties.map((prop) => (
              <th
                key={prop.id}
                className="text-left text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium px-3 py-2 border-b border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] min-w-[140px]"
              >
                {prop.name}
                <span className="ml-2 text-[9px] text-black/25 dark:text-white/25 normal-case tracking-normal">
                  {prop.type}
                </span>
              </th>
            ))}
            <th className="text-left text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium px-3 py-2 border-b border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <AddPropertyButton onAdd={onAddProperty} />
            </th>
          </tr>
        </thead>
        <tbody>
          {database.rows.map((row) => (
            <tr key={row.id} className="group hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
              <td className="border-b border-black/[0.04] dark:border-white/[0.04] px-1 py-1">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDeleteRow(row.id)}
                    className="text-black/25 dark:text-white/25 hover:text-red-500 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </td>
              {database.properties.map((prop) => (
                <td
                  key={prop.id}
                  className="border-b border-black/[0.04] dark:border-white/[0.04] px-3 py-1.5 align-middle"
                >
                  <PropertyEditor
                    property={prop}
                    value={row.values?.[prop.id]}
                    onChange={(v) => updateValue(row, prop.id, v)}
                  />
                </td>
              ))}
              <td className="border-b border-black/[0.04] dark:border-white/[0.04]" />
            </tr>
          ))}
          <tr>
            <td colSpan={database.properties.length + 2} className="px-3 py-1.5">
              <button
                onClick={onAddRow}
                className="flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AddPropertyButton({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const types = [
    { id: "text", label: "Text" },
    { id: "number", label: "Number" },
    { id: "select", label: "Select" },
    { id: "multi_select", label: "Multi-select" },
    { id: "status", label: "Status" },
    { id: "date", label: "Date" },
    { id: "checkbox", label: "Checkbox" },
    { id: "url", label: "URL" },
  ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white normal-case tracking-normal text-xs"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 min-w-[140px] rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-xl py-1">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onAdd(t.id);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-xs text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
