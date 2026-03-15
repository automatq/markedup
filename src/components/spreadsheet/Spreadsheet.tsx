"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useStorage,
  useMutation,
  useOthers,
  useSelf,
} from "@liveblocks/react/suspense";
import { LiveMap, LiveObject } from "@liveblocks/client";
import {
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  Download,
  Undo2,
  Redo2,
  FileText,
} from "lucide-react";
import { useHistory } from "@liveblocks/react";
import { useParams, useRouter } from "next/navigation";

// ── Types ──

interface CellData {
  value: string;
  formula?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  bg?: string;
}

interface SheetMeta {
  colCount: number;
  rowCount: number;
  colWidths: string; // JSON stringified number[]
  frozenRows: number;
  frozenCols: number;
}

// ── Helpers ──

function colLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function cellKey(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`;
}

function parseCellKey(key: string): { col: number; row: number } | null {
  const match = key.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { col: col - 1, row: parseInt(match[2]) - 1 };
}

/** Resolve formulas: =SUM(A1:A5), =AVERAGE(B1:B3), =COUNT, =MIN, =MAX, cell refs like =A1 */
function resolveFormula(
  formula: string,
  getCellValue: (key: string) => string
): string {
  if (!formula.startsWith("=")) return formula;
  const expr = formula.slice(1).trim();

  // Range functions: SUM, AVERAGE, COUNT, MIN, MAX
  const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|COUNT|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase();
    const start = parseCellKey(fnMatch[2].toUpperCase());
    const end = parseCellKey(fnMatch[3].toUpperCase());
    if (!start || !end) return "#REF!";

    const values: number[] = [];
    for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
      for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
        const v = parseFloat(getCellValue(cellKey(c, r)));
        if (!isNaN(v)) values.push(v);
      }
    }

    if (fn === "SUM") return values.reduce((a, b) => a + b, 0).toString();
    if (fn === "AVERAGE" || fn === "AVG") return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : "0";
    if (fn === "COUNT") return values.length.toString();
    if (fn === "MIN") return values.length ? Math.min(...values).toString() : "0";
    if (fn === "MAX") return values.length ? Math.max(...values).toString() : "0";
  }

  // Simple cell reference: =A1
  const refMatch = expr.match(/^([A-Z]+\d+)$/i);
  if (refMatch) {
    return getCellValue(refMatch[1].toUpperCase());
  }

  // Simple arithmetic: =A1+B1, =A1*2, etc.
  try {
    const replaced = expr.replace(/[A-Z]+\d+/gi, (ref) => {
      const val = getCellValue(ref.toUpperCase());
      const num = parseFloat(val);
      return isNaN(num) ? "0" : num.toString();
    });
    // Safely evaluate simple math (only numbers and operators)
    if (/^[\d\s+\-*/().]+$/.test(replaced)) {
      const result = new Function(`return (${replaced})`)();
      return typeof result === "number" && isFinite(result) ? result.toString() : "#ERR!";
    }
  } catch {
    return "#ERR!";
  }

  return formula;
}

// ── Default dimensions ──

const DEFAULT_COLS = 26;
const DEFAULT_ROWS = 100;
const DEFAULT_COL_WIDTH = 120;
const ROW_HEADER_WIDTH = 48;
const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 32;

// ── Component ──

export function Spreadsheet() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const history = useHistory();

  // ── Storage ──
  const cells = useStorage((root) => {
    const c = root.cells;
    if (!c) return new Map<string, CellData>();
    const map = new Map<string, CellData>();
    try {
      const entries = c as any;
      if (entries && typeof entries.forEach === "function") {
        entries.forEach((val: any, key: string) => {
          const obj = val && typeof val.toObject === "function" ? val.toObject() : val;
          map.set(key, obj as CellData);
        });
      }
    } catch {
      // empty
    }
    return map;
  });

  const meta = useStorage((root) => {
    const m = root.meta;
    if (!m) return null;
    try {
      return (m as any).toObject ? (m as any).toObject() : m;
    } catch {
      return null;
    }
  }) as SheetMeta | null;

  const colCount = meta?.colCount ?? DEFAULT_COLS;
  const rowCount = meta?.rowCount ?? DEFAULT_ROWS;
  const colWidths: number[] = useMemo(() => {
    if (meta?.colWidths) {
      try { return JSON.parse(meta.colWidths); } catch { /* fall through */ }
    }
    return Array(colCount).fill(DEFAULT_COL_WIDTH);
  }, [meta?.colWidths, colCount]);

  // ── Ensure storage exists ──
  const ensureStorage = useMutation(({ storage }) => {
    if (!storage.get("cells")) {
      storage.set("cells", new LiveMap() as any);
    }
    if (!storage.get("meta")) {
      storage.set("meta", new LiveObject({
        colCount: DEFAULT_COLS,
        rowCount: DEFAULT_ROWS,
        colWidths: JSON.stringify(Array(DEFAULT_COLS).fill(DEFAULT_COL_WIDTH)),
        frozenRows: 0,
        frozenCols: 0,
      }) as any);
    }
  }, []);

  useEffect(() => {
    ensureStorage();
  }, [ensureStorage]);

  // ── Mutations ──
  const setCell = useMutation(({ storage }, key: string, data: Partial<CellData>) => {
    let cellsMap = storage.get("cells") as any;
    if (!cellsMap) {
      cellsMap = new LiveMap();
      storage.set("cells", cellsMap as any);
    }
    const existing = cellsMap.get(key);
    if (existing) {
      const obj = existing.toObject ? existing.toObject() : existing;
      cellsMap.set(key, new LiveObject({ ...obj, ...data }));
    } else {
      cellsMap.set(key, new LiveObject({ value: "", ...data }));
    }
  }, []);

  const deleteCell = useMutation(({ storage }, key: string) => {
    const cellsMap = storage.get("cells") as any;
    if (cellsMap) cellsMap.delete(key);
  }, []);

  const updateMeta = useMutation(({ storage }, updates: Partial<SheetMeta>) => {
    const m = storage.get("meta") as any;
    if (m && typeof m.update === "function") {
      m.update(updates);
    }
  }, []);

  // ── Presence ──
  const others = useOthers();
  const self = useSelf();

  // Map of cellKey → array of user colors currently selecting that cell
  const otherSelections = useMemo(() => {
    const map = new Map<string, { name: string; color: string }[]>();
    for (const other of others) {
      const sel = (other.presence as any)?.selectedCell;
      if (sel) {
        const arr = map.get(sel) || [];
        arr.push({
          name: other.info?.name || "?",
          color: (other.info as any)?.color || "#6366f1",
        });
        map.set(sel, arr);
      }
    }
    return map;
  }, [others]);

  // ── Local state ──
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: string; end: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Broadcast selected cell via presence
  const updatePresence = useMutation(({ self: _s, setMyPresence }, cell: string | null) => {
    setMyPresence({ selectedCell: cell } as any);
  }, []);

  // getCellValue for formula resolution
  const getCellValue = useCallback(
    (key: string): string => {
      const cell = cells?.get(key);
      if (!cell) return "";
      if (cell.formula) {
        return resolveFormula(cell.formula, getCellValue);
      }
      return cell.value || "";
    },
    [cells]
  );

  const getDisplayValue = useCallback(
    (key: string): string => {
      const cell = cells?.get(key);
      if (!cell) return "";
      if (cell.formula) {
        return resolveFormula(cell.formula, getCellValue);
      }
      return cell.value || "";
    },
    [cells, getCellValue]
  );

  // ── Cell selection ──
  const handleCellClick = useCallback(
    (key: string) => {
      if (editingCell && editingCell !== key) {
        // Commit current edit
        const cell = cells?.get(editingCell);
        const isFormula = editValue.startsWith("=");
        setCell(editingCell, {
          value: isFormula ? "" : editValue,
          formula: isFormula ? editValue : undefined,
        });
        setEditingCell(null);
      }
      setSelectedCell(key);
      updatePresence(key);
      setContextMenu(null);
    },
    [editingCell, editValue, cells, setCell, updatePresence]
  );

  const handleCellDoubleClick = useCallback(
    (key: string) => {
      setEditingCell(key);
      const cell = cells?.get(key);
      setEditValue(cell?.formula || cell?.value || "");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [cells]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const isFormula = editValue.startsWith("=");
    setCell(editingCell, {
      value: isFormula ? "" : editValue,
      formula: isFormula ? editValue : undefined,
    });
    setEditingCell(null);
  }, [editingCell, editValue, setCell]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEdit();
          // Move down
          const parsed = parseCellKey(editingCell);
          if (parsed && parsed.row < rowCount - 1) {
            const next = cellKey(parsed.col, parsed.row + 1);
            setSelectedCell(next);
            updatePresence(next);
          }
        } else if (e.key === "Escape") {
          setEditingCell(null);
        } else if (e.key === "Tab") {
          e.preventDefault();
          commitEdit();
          const parsed = parseCellKey(editingCell);
          if (parsed) {
            const next = e.shiftKey
              ? cellKey(Math.max(0, parsed.col - 1), parsed.row)
              : cellKey(Math.min(colCount - 1, parsed.col + 1), parsed.row);
            setSelectedCell(next);
            updatePresence(next);
          }
        }
        return;
      }

      if (!selectedCell) return;
      const parsed = parseCellKey(selectedCell);
      if (!parsed) return;

      let nextCol = parsed.col;
      let nextRow = parsed.row;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          nextRow = Math.max(0, parsed.row - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          nextRow = Math.min(rowCount - 1, parsed.row + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextCol = Math.max(0, parsed.col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          nextCol = Math.min(colCount - 1, parsed.col + 1);
          break;
        case "Tab":
          e.preventDefault();
          nextCol = e.shiftKey
            ? Math.max(0, parsed.col - 1)
            : Math.min(colCount - 1, parsed.col + 1);
          break;
        case "Enter":
          e.preventDefault();
          handleCellDoubleClick(selectedCell);
          return;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          deleteCell(selectedCell);
          return;
        default:
          // Start typing to edit
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            setEditingCell(selectedCell);
            setEditValue(e.key);
            setTimeout(() => inputRef.current?.focus(), 0);
            return;
          }
          // Undo/redo
          if ((e.metaKey || e.ctrlKey) && e.key === "z") {
            e.preventDefault();
            if (e.shiftKey) history.redo();
            else history.undo();
            return;
          }
          return;
      }

      const next = cellKey(nextCol, nextRow);
      setSelectedCell(next);
      updatePresence(next);
    },
    [selectedCell, editingCell, commitEdit, handleCellDoubleClick, deleteCell, colCount, rowCount, updatePresence, history]
  );

  // ── Formatting ──
  const toggleBold = useCallback(() => {
    if (!selectedCell) return;
    const cell = cells?.get(selectedCell);
    setCell(selectedCell, { bold: !(cell?.bold) });
  }, [selectedCell, cells, setCell]);

  const toggleItalic = useCallback(() => {
    if (!selectedCell) return;
    const cell = cells?.get(selectedCell);
    setCell(selectedCell, { italic: !(cell?.italic) });
  }, [selectedCell, cells, setCell]);

  const setAlign = useCallback(
    (align: "left" | "center" | "right") => {
      if (!selectedCell) return;
      setCell(selectedCell, { align });
    },
    [selectedCell, setCell]
  );

  // ── Add/delete rows/cols ──
  const addRow = useCallback(() => {
    updateMeta({ rowCount: rowCount + 1 });
  }, [rowCount, updateMeta]);

  const addCol = useCallback(() => {
    const newWidths = [...colWidths, DEFAULT_COL_WIDTH];
    updateMeta({ colCount: colCount + 1, colWidths: JSON.stringify(newWidths) });
  }, [colCount, colWidths, updateMeta]);

  // ── Column resize ──
  const resizingCol = useRef<{ col: number; startX: number; startWidth: number } | null>(null);

  const handleColResizeStart = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingCol.current = { col, startX: e.clientX, startWidth: colWidths[col] || DEFAULT_COL_WIDTH };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingCol.current) return;
        const diff = ev.clientX - resizingCol.current.startX;
        const newWidth = Math.max(50, resizingCol.current.startWidth + diff);
        const newWidths = [...colWidths];
        newWidths[resizingCol.current.col] = newWidth;
        updateMeta({ colWidths: JSON.stringify(newWidths) });
      };

      const onMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colWidths, updateMeta]
  );

  // ── Export CSV ──
  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    for (let r = 0; r < rowCount; r++) {
      const row: string[] = [];
      for (let c = 0; c < colCount; c++) {
        const key = cellKey(c, r);
        row.push(getDisplayValue(key));
      }
      rows.push(row);
    }
    // Trim trailing empty rows
    while (rows.length > 0 && rows[rows.length - 1].every((v) => !v)) rows.pop();

    const csv = rows.map((row) =>
      row.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spreadsheet.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [rowCount, colCount, getDisplayValue]);

  // ── Save to Document ──
  const [saving, setSaving] = useState(false);
  const saveToDocument = useCallback(async () => {
    if (!params?.workspaceId) return;
    setSaving(true);
    try {
      // Build data rows (trim trailing empties)
      const dataRows: string[][] = [];
      for (let r = 0; r < rowCount; r++) {
        const row: string[] = [];
        for (let c = 0; c < colCount; c++) {
          row.push(getDisplayValue(cellKey(c, r)));
        }
        dataRows.push(row);
      }
      while (dataRows.length > 0 && dataRows[dataRows.length - 1].every((v) => !v)) dataRows.pop();
      // Trim trailing empty columns
      let maxCol = 0;
      for (const row of dataRows) {
        for (let c = row.length - 1; c >= 0; c--) {
          if (row[c]) { maxCol = Math.max(maxCol, c); break; }
        }
      }
      const trimmedRows = dataRows.map((row) => row.slice(0, maxCol + 1));

      // Build TipTap table node
      const headerRow = trimmedRows[0] || [];
      const bodyRows = trimmedRows.slice(1);

      const makeCell = (text: string, isHeader: boolean) => ({
        type: isHeader ? "tableHeader" : "tableCell",
        content: text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : [{ type: "paragraph" }],
      });

      const tableContent = [];
      if (headerRow.length > 0) {
        tableContent.push({
          type: "tableRow",
          content: headerRow.map((v) => makeCell(v, true)),
        });
      }
      for (const row of bodyRows) {
        // Pad row to match header length
        while (row.length < headerRow.length) row.push("");
        tableContent.push({
          type: "tableRow",
          content: row.map((v) => makeCell(v, false)),
        });
      }

      const content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Spreadsheet Export" }],
          },
          ...(tableContent.length > 0
            ? [{ type: "table", content: tableContent }]
            : [{ type: "paragraph", content: [{ type: "text", text: "(Empty spreadsheet)" }] }]),
        ],
      };

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: params.workspaceId,
          title: `Spreadsheet — ${new Date().toLocaleDateString()}`,
          content,
          sourceType: "spreadsheet",
        }),
      });
      if (res.ok) {
        const doc = await res.json();
        router.push(`/${params.workspaceId}/${doc.id}`);
      }
    } catch {
      // silently handle
    }
    setSaving(false);
  }, [params?.workspaceId, router, rowCount, colCount, getDisplayValue]);

  // ── Total width for grid ──
  const totalWidth = useMemo(
    () => ROW_HEADER_WIDTH + colWidths.reduce((sum, w) => sum + w, 0),
    [colWidths]
  );

  // ── Formula bar value ──
  const formulaBarValue = useMemo(() => {
    if (editingCell) return editValue;
    if (!selectedCell) return "";
    const cell = cells?.get(selectedCell);
    return cell?.formula || cell?.value || "";
  }, [selectedCell, editingCell, editValue, cells]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#09090b]" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-black/8 dark:border-white/[0.08] bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-md shrink-0">
        <button onClick={() => history.undo()} className="toolbar-btn" title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => history.redo()} className="toolbar-btn" title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-black/8 dark:bg-white/8" />

        <button onClick={toggleBold} className={`toolbar-btn ${selectedCell && cells?.get(selectedCell)?.bold ? "toolbar-btn-active" : ""}`} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button onClick={toggleItalic} className={`toolbar-btn ${selectedCell && cells?.get(selectedCell)?.italic ? "toolbar-btn-active" : ""}`} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-black/8 dark:bg-white/8" />

        <button onClick={() => setAlign("left")} className="toolbar-btn" title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setAlign("center")} className="toolbar-btn" title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setAlign("right")} className="toolbar-btn" title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-4 w-px bg-black/8 dark:bg-white/8" />

        <button onClick={addCol} className="toolbar-btn" title="Add column">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-[10px] ml-0.5">Col</span>
        </button>
        <button onClick={addRow} className="toolbar-btn" title="Add row">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-[10px] ml-0.5">Row</span>
        </button>

        <div className="flex-1" />

        {/* Collaborators */}
        <div className="flex items-center -space-x-1.5 mr-2">
          {others.slice(0, 5).map((other) => (
            <div
              key={other.connectionId}
              className="h-6 w-6 rounded-full border-2 border-white dark:border-[#09090b] flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: (other.info as any)?.color || "#6366f1" }}
              title={other.info?.name || ""}
            >
              {(other.info?.name || "?")[0]}
            </div>
          ))}
          {others.length > 5 && (
            <div className="h-6 w-6 rounded-full border-2 border-white dark:border-[#09090b] bg-black/20 dark:bg-white/10 flex items-center justify-center text-[9px] text-black/60 dark:text-white/60">
              +{others.length - 5}
            </div>
          )}
        </div>

        <button onClick={exportCSV} className="toolbar-btn" title="Export CSV">
          <Download className="h-3.5 w-3.5" />
        </button>
        <button onClick={saveToDocument} disabled={saving} className="toolbar-btn" title="Save to document">
          <FileText className="h-3.5 w-3.5" />
          <span className="text-[10px] ml-1 font-medium">{saving ? "Saving…" : "To Doc"}</span>
        </button>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-black/8 dark:border-white/[0.08] bg-white/50 dark:bg-[#0f0f11]/50 shrink-0">
        <span className="text-[11px] font-mono font-medium text-black/40 dark:text-white/40 w-12 text-center">
          {selectedCell || ""}
        </span>
        <div className="h-4 w-px bg-black/8 dark:bg-white/8" />
        <span className="text-[11px] text-black/30 dark:text-white/30 mr-1">fx</span>
        <input
          ref={editingCell ? undefined : inputRef}
          className="flex-1 bg-transparent text-xs text-black dark:text-white outline-none font-mono"
          value={formulaBarValue}
          onChange={(e) => {
            if (editingCell) {
              setEditValue(e.target.value);
            } else if (selectedCell) {
              setEditingCell(selectedCell);
              setEditValue(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            }
          }}
          placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
        />
      </div>

      {/* Grid */}
      <div ref={gridRef} className="flex-1 overflow-auto relative">
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          {/* Column headers */}
          <div className="sticky top-0 z-20 flex" style={{ height: HEADER_HEIGHT }}>
            {/* Corner cell */}
            <div
              className="sticky left-0 z-30 border-b border-r border-black/8 dark:border-white/[0.08] bg-neutral-50 dark:bg-[#111113]"
              style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
            />
            {Array.from({ length: colCount }).map((_, c) => (
              <div
                key={c}
                className="relative border-b border-r border-black/8 dark:border-white/[0.08] bg-neutral-50 dark:bg-[#111113] flex items-center justify-center text-[11px] font-medium text-black/40 dark:text-white/40 select-none"
                style={{ width: colWidths[c] || DEFAULT_COL_WIDTH, minWidth: colWidths[c] || DEFAULT_COL_WIDTH, height: HEADER_HEIGHT }}
              >
                {colLabel(c)}
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/30 z-10"
                  onMouseDown={(e) => handleColResizeStart(c, e)}
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: rowCount }).map((_, r) => (
            <div key={r} className="flex" style={{ height: ROW_HEIGHT }}>
              {/* Row header */}
              <div
                className="sticky left-0 z-10 border-b border-r border-black/8 dark:border-white/[0.08] bg-neutral-50 dark:bg-[#111113] flex items-center justify-center text-[11px] font-medium text-black/40 dark:text-white/40 select-none"
                style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
              >
                {r + 1}
              </div>

              {/* Cells */}
              {Array.from({ length: colCount }).map((_, c) => {
                const key = cellKey(c, r);
                const cell = cells?.get(key);
                const isSelected = selectedCell === key;
                const isEditing = editingCell === key;
                const otherUsers = otherSelections.get(key);

                return (
                  <div
                    key={c}
                    className={`relative border-b border-r border-black/[0.06] dark:border-white/[0.06] cursor-cell transition-colors ${
                      isSelected
                        ? "ring-2 ring-blue-500 ring-inset z-[5]"
                        : ""
                    }`}
                    style={{
                      width: colWidths[c] || DEFAULT_COL_WIDTH,
                      minWidth: colWidths[c] || DEFAULT_COL_WIDTH,
                      backgroundColor: cell?.bg || undefined,
                    }}
                    onClick={() => handleCellClick(key)}
                    onDoubleClick={() => handleCellDoubleClick(key)}
                  >
                    {/* Other user selection indicator */}
                    {otherUsers && (
                      <div
                        className="absolute inset-0 pointer-events-none z-[4]"
                        style={{ boxShadow: `inset 0 0 0 2px ${otherUsers[0].color}` }}
                      >
                        <div
                          className="absolute -top-4 left-0 px-1 py-0.5 text-[9px] font-medium text-white rounded-sm whitespace-nowrap"
                          style={{ backgroundColor: otherUsers[0].color }}
                        >
                          {otherUsers[0].name}
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="absolute inset-0 w-full h-full px-2 bg-white dark:bg-[#18181b] text-xs text-black dark:text-white outline-none font-mono z-[6]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        autoFocus
                      />
                    ) : (
                      <div
                        className={`px-2 h-full flex items-center text-xs truncate ${
                          cell?.bold ? "font-bold" : ""
                        } ${cell?.italic ? "italic" : ""}`}
                        style={{
                          justifyContent: cell?.align === "center" ? "center" : cell?.align === "right" ? "flex-end" : "flex-start",
                          color: cell?.color || undefined,
                        }}
                      >
                        <span className="text-black/80 dark:text-white/80">
                          {getDisplayValue(key)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
