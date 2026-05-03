"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { DBProperty, SelectOption } from "./types";

interface PropertyEditorProps {
  property: DBProperty;
  value: any;
  onChange: (value: any) => void;
  className?: string;
  inline?: boolean;
}

export function PropertyEditor({ property, value, onChange, className = "", inline = false }: PropertyEditorProps) {
  switch (property.type) {
    case "title":
    case "text":
      return <TextEditor value={value} onChange={onChange} className={className} placeholder={property.name} />;

    case "number":
      return <NumberEditor value={value} onChange={onChange} className={className} />;

    case "checkbox":
      return <CheckboxEditor value={value} onChange={onChange} />;

    case "url":
      return <UrlEditor value={value} onChange={onChange} className={className} />;

    case "date":
      return <DateEditor value={value} onChange={onChange} className={className} />;

    case "select":
    case "status":
      return (
        <SelectEditor
          value={value}
          onChange={onChange}
          options={(property.config?.options ?? []) as SelectOption[]}
          inline={inline}
        />
      );

    case "multi_select":
      return (
        <MultiSelectEditor
          value={value}
          onChange={onChange}
          options={(property.config?.options ?? []) as SelectOption[]}
        />
      );

    default:
      return <TextEditor value={String(value ?? "")} onChange={onChange} className={className} />;
  }
}

function TextEditor({ value, onChange, className = "", placeholder = "" }: { value: any; onChange: (v: any) => void; className?: string; placeholder?: string }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onChange(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`w-full bg-transparent text-sm text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none ${className}`}
    />
  );
}

function NumberEditor({ value, onChange, className = "" }: { value: any; onChange: (v: any) => void; className?: string }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = local === "" ? null : Number(local);
        if (n !== value) onChange(n);
      }}
      className={`w-full bg-transparent text-sm text-black dark:text-white outline-none tabular-nums ${className}`}
    />
  );
}

function CheckboxEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
        value
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30"
      }`}
    >
      {value && <Check className="h-3 w-3" />}
    </button>
  );
}

function UrlEditor({ value, onChange, className = "" }: { value: any; onChange: (v: any) => void; className?: string }) {
  const [local, setLocal] = useState(value ?? "");
  const [editing, setEditing] = useState(false);
  useEffect(() => setLocal(value ?? ""), [value]);

  if (!editing && value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.preventDefault();
          setEditing(true);
        }}
        className={`text-sm text-indigo-500 dark:text-indigo-400 underline truncate block ${className}`}
      >
        {value}
      </a>
    );
  }

  return (
    <input
      type="url"
      autoFocus={editing}
      value={local}
      placeholder="https://..."
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (local !== value) onChange(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`w-full bg-transparent text-sm text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none ${className}`}
    />
  );
}

function DateEditor({ value, onChange, className = "" }: { value: any; onChange: (v: any) => void; className?: string }) {
  const dateValue = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <input
      type="date"
      value={dateValue}
      onChange={(e) => onChange(e.target.value || null)}
      className={`w-full bg-transparent text-sm text-black dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark] ${className}`}
    />
  );
}

function SelectEditor({
  value,
  onChange,
  options,
  inline,
}: {
  value: any;
  onChange: (v: any) => void;
  options: SelectOption[];
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 w-full text-left"
      >
        {selected ? (
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `${selected.color}1a`,
              color: selected.color,
            }}
          >
            {selected.label}
          </span>
        ) : (
          <span className="text-xs text-black/30 dark:text-white/30">Select…</span>
        )}
        {!inline && <ChevronDown className="h-3 w-3 ml-auto text-black/30 dark:text-white/30" />}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 min-w-[160px] rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-xl py-1">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-black/40 dark:text-white/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            >
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${opt.color}1a`,
                  color: opt.color,
                }}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectEditor({
  value,
  onChange,
  options,
}: {
  value: any;
  onChange: (v: any) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const arr = Array.isArray(value) ? (value as string[]) : [];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = useCallback(
    (id: string) => {
      if (arr.includes(id)) {
        onChange(arr.filter((x) => x !== id));
      } else {
        onChange([...arr, id]);
      }
    },
    [arr, onChange]
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 w-full text-left flex-wrap"
      >
        {arr.length === 0 ? (
          <span className="text-xs text-black/30 dark:text-white/30">Select…</span>
        ) : (
          arr.map((id) => {
            const opt = options.find((o) => o.id === id);
            if (!opt) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: `${opt.color}1a`, color: opt.color }}
              >
                {opt.label}
              </span>
            );
          })
        )}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 min-w-[160px] rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-xl py-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            >
              <span
                className={`flex h-3 w-3 items-center justify-center rounded border ${
                  arr.includes(opt.id)
                    ? "bg-black border-black dark:bg-white dark:border-white text-white dark:text-black"
                    : "border-black/20 dark:border-white/20"
                }`}
              >
                {arr.includes(opt.id) && <Check className="h-2 w-2" />}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: `${opt.color}1a`, color: opt.color }}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
