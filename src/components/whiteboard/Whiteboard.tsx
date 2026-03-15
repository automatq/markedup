"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useMutation,
  useStorage,
  useOthers,
  useSelf,
  useHistory,
} from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import {
  Pencil,
  Square,
  Circle,
  Minus,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  MousePointer2,
  Download,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
} from "lucide-react";

/* ── Types ── */

interface Point {
  x: number;
  y: number;
}

interface WhiteboardShape {
  id: string;
  type: "path" | "rect" | "ellipse" | "line" | "text";
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  createdBy: string;
}

type Tool = "select" | "pen" | "rect" | "ellipse" | "line" | "text" | "eraser";

const COLORS = [
  "#000000", "#ffffff",
  "#cd7f32", "#d4af37", "#c0c0c0", "#e5e4e2",
  "#b76e79", "#b87333", "#878681", "#2a3439",
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
];

const STROKE_WIDTHS = [2, 4, 8, 16];

/* ── Whiteboard Component ── */

export function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [boardMode, setBoardMode] = useState<"blackboard" | "whiteboard">("blackboard");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(4);

  const bgColor = boardMode === "blackboard" ? "#09090b" : "#fafafa";
  const gridColor = boardMode === "blackboard" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  const shapes = useStorage((root) => {
    const s = root.shapes;
    if (!s) return [];
    // Convert LiveObjects to plain objects for rendering
    try {
      return [...(s as any)].map((item: any) => {
        if (item && typeof item.toObject === "function") return item.toObject();
        return item;
      }) as WhiteboardShape[];
    } catch {
      return [];
    }
  });
  const self = useSelf();
  const others = useOthers();
  const history = useHistory();

  // Ensure shapes LiveList exists in storage, create if missing
  const ensureShapes = useMutation(({ storage }) => {
    if (!storage.get("shapes")) {
      storage.set("shapes", new LiveList([]) as any);
    }
  }, []);

  // Init storage on mount
  useEffect(() => {
    ensureShapes();
  }, [ensureShapes]);

  const addShape = useMutation(({ storage }, shape: WhiteboardShape) => {
    let shapesList = storage.get("shapes") as any;
    if (!shapesList) {
      shapesList = new LiveList([]);
      storage.set("shapes", shapesList as any);
    }
    shapesList.push(new LiveObject(shape as any));
  }, []);

  const removeShape = useMutation(({ storage }, shapeId: string) => {
    const shapesList = storage.get("shapes") as any;
    if (!shapesList) return;
    const arr = [...shapesList];
    const idx = arr.findIndex((s: any) => {
      if (s && typeof s.get === "function") return s.get("id") === shapeId;
      return s?.id === shapeId;
    });
    if (idx !== -1) shapesList.delete(idx);
  }, []);

  const clearAll = useMutation(({ storage }) => {
    const shapesList = storage.get("shapes") as any;
    if (!shapesList) return;
    while (shapesList.length > 0) shapesList.delete(0);
  }, []);

  /* ── Coordinate transform ── */
  const screenToCanvas = useCallback(
    (e: React.MouseEvent): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan]
  );

  /* ── Draw everything ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Board background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid
    const gridSize = 40;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / zoom;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / zoom + gridSize;
    const endY = startY + canvas.height / zoom + gridSize;
    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Draw stored shapes
    if (shapes) {
      for (const shape of shapes) {
        drawShape(ctx, shape);
      }
    }

    // Draw current in-progress shape
    if (isDrawing && currentPoints.length > 0) {
      if (tool === "pen") {
        drawPath(ctx, currentPoints, color, strokeWidth);
      } else if (tool === "eraser") {
        drawPath(ctx, currentPoints, bgColor, strokeWidth * 4);
      } else if (startPoint && currentPoints.length > 0) {
        const end = currentPoints[currentPoints.length - 1];
        if (tool === "rect") {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.strokeRect(startPoint.x, startPoint.y, end.x - startPoint.x, end.y - startPoint.y);
        } else if (tool === "ellipse") {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          const cx = (startPoint.x + end.x) / 2;
          const cy = (startPoint.y + end.y) / 2;
          const rx = Math.abs(end.x - startPoint.x) / 2;
          const ry = Math.abs(end.y - startPoint.y) / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (tool === "line") {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }
    }

    // Draw other users' cursors
    for (const other of others) {
      const cursor = other.presence?.cursor as Point | null;
      if (cursor) {
        const info = other.info;
        ctx.save();
        ctx.fillStyle = info?.color || "#6366f1";
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(cursor.x, cursor.y + 16);
        ctx.lineTo(cursor.x + 10, cursor.y + 10);
        ctx.closePath();
        ctx.fill();

        ctx.font = "10px sans-serif";
        ctx.fillStyle = info?.color || "#6366f1";
        ctx.fillRect(cursor.x + 10, cursor.y + 10, ctx.measureText(info?.name || "").width + 8, 16);
        ctx.fillStyle = "#fff";
        ctx.fillText(info?.name || "", cursor.x + 14, cursor.y + 22);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [shapes, isDrawing, currentPoints, startPoint, tool, color, strokeWidth, zoom, pan, others, bgColor, gridColor]);

  useEffect(() => {
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  /* ── Presence: broadcast cursor ── */
  const updatePresence = useMutation(({ self: _self, setMyPresence }, cursor: Point | null) => {
    setMyPresence({ cursor: cursor as any });
  }, []);

  /* ── Mouse handlers ── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) return; // middle click
      const pt = screenToCanvas(e);

      if (tool === "text") {
        setTextInput(pt);
        setTextValue("");
        return;
      }

      if (tool === "select") return;

      setIsDrawing(true);
      setCurrentPoints([pt]);
      setStartPoint(pt);
    },
    [tool, screenToCanvas]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pt = screenToCanvas(e);
      updatePresence(pt);

      if (!isDrawing) return;
      setCurrentPoints((prev) => [...prev, pt]);
    },
    [isDrawing, screenToCanvas, updatePresence]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (tool === "pen" && currentPoints.length > 1) {
      addShape({
        id,
        type: "path",
        points: currentPoints,
        color,
        strokeWidth,
        createdBy: self?.id || "",
      });
    } else if (tool === "eraser" && currentPoints.length > 1) {
      addShape({
        id,
        type: "path",
        points: currentPoints,
        color: bgColor,
        strokeWidth: strokeWidth * 4,
        createdBy: self?.id || "",
      });
    } else if (startPoint && currentPoints.length > 0) {
      const end = currentPoints[currentPoints.length - 1];
      if (tool === "rect") {
        addShape({
          id,
          type: "rect",
          x: Math.min(startPoint.x, end.x),
          y: Math.min(startPoint.y, end.y),
          width: Math.abs(end.x - startPoint.x),
          height: Math.abs(end.y - startPoint.y),
          color,
          strokeWidth,
          createdBy: self?.id || "",
        });
      } else if (tool === "ellipse") {
        addShape({
          id,
          type: "ellipse",
          x: Math.min(startPoint.x, end.x),
          y: Math.min(startPoint.y, end.y),
          width: Math.abs(end.x - startPoint.x),
          height: Math.abs(end.y - startPoint.y),
          color,
          strokeWidth,
          createdBy: self?.id || "",
        });
      } else if (tool === "line") {
        addShape({
          id,
          type: "line",
          points: [startPoint, end],
          color,
          strokeWidth,
          createdBy: self?.id || "",
        });
      }
    }

    setCurrentPoints([]);
    setStartPoint(null);
  }, [isDrawing, tool, currentPoints, startPoint, color, strokeWidth, self, addShape, bgColor]);

  const handleMouseLeave = useCallback(() => {
    updatePresence(null);
    if (isDrawing) handleMouseUp();
  }, [updatePresence, isDrawing, handleMouseUp]);

  /* ── Text submit ── */
  const handleTextSubmit = useCallback(() => {
    if (textInput && textValue.trim()) {
      addShape({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "text",
        x: textInput.x,
        y: textInput.y,
        text: textValue.trim(),
        color,
        strokeWidth: 16,
        createdBy: self?.id || "",
      });
    }
    setTextInput(null);
    setTextValue("");
  }, [textInput, textValue, color, self, addShape]);

  /* ── Zoom ── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
      setZoom(newZoom);
    },
    [zoom]
  );

  /* ── Export ── */
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const tools: { key: Tool; icon: React.ReactNode; label: string }[] = [
    { key: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select" },
    { key: "pen", icon: <Pencil className="h-4 w-4" />, label: "Pen" },
    { key: "rect", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
    { key: "ellipse", icon: <Circle className="h-4 w-4" />, label: "Ellipse" },
    { key: "line", icon: <Minus className="h-4 w-4" />, label: "Line" },
    { key: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
    { key: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  ];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-black/8 dark:border-white/[0.12] bg-white/95 dark:bg-[#161618]/95 backdrop-blur-md px-2 py-1.5 shadow-lg">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setTool(t.key)}
            title={t.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              tool === t.key
                ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        {/* Stroke width */}
        {STROKE_WIDTHS.map((sw) => (
          <button
            key={sw}
            onClick={() => setStrokeWidth(sw)}
            title={`${sw}px`}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              strokeWidth === sw
                ? "bg-black/10 dark:bg-white/10"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <div
              className="rounded-full bg-black dark:bg-white"
              style={{ width: Math.min(sw + 2, 14), height: Math.min(sw + 2, 14) }}
            />
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full border transition-all ${
                color === c
                  ? "scale-125 ring-2 ring-offset-1 ring-black/20 dark:ring-white/20 dark:ring-offset-black"
                  : "border-black/10 dark:border-white/10 hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        {/* Actions */}
        <button onClick={() => history.undo()} title="Undo" className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={() => history.redo()} title="Redo" className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <Redo2 className="h-4 w-4" />
        </button>
        <button onClick={clearAll} title="Clear all" className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={handleExport} title="Export PNG" className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <Download className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        {/* Board mode toggle */}
        <button
          onClick={() => {
            setBoardMode((m) => m === "blackboard" ? "whiteboard" : "blackboard");
            setColor((c) => c === "#ffffff" ? "#000000" : c === "#000000" ? "#ffffff" : c);
          }}
          title={boardMode === "blackboard" ? "Switch to whiteboard" : "Switch to markerboard"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {boardMode === "blackboard" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-black/8 dark:border-white/[0.12] bg-white/95 dark:bg-[#161618]/95 backdrop-blur-md px-1 py-1 shadow-lg">
        <button onClick={() => setZoom((z) => Math.max(z * 0.8, 0.1))} className="flex h-7 w-7 items-center justify-center rounded text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-medium text-black/50 dark:text-white/50 w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom((z) => Math.min(z * 1.2, 5))} className="flex h-7 w-7 items-center justify-center rounded text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Connected users */}
      {others.length > 0 && (
        <div className="absolute top-3 right-3 z-10 flex -space-x-2">
          {others.map((other) => (
            <div
              key={other.connectionId}
              className="h-7 w-7 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: other.info?.color || "#6366f1" }}
              title={other.info?.name}
            >
              {other.info?.name?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {/* Text input overlay */}
      {textInput && (
        <input
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") { setTextInput(null); setTextValue(""); } }}
          onBlur={handleTextSubmit}
          className="absolute z-20 border-2 border-blue-400 rounded px-1 py-0.5 text-sm bg-white dark:bg-black text-black dark:text-white outline-none"
          style={{
            left: textInput.x * zoom + pan.x,
            top: textInput.y * zoom + pan.y,
            fontSize: `${strokeWidth}px`,
            color,
          }}
        />
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className={`h-full w-full ${
          tool === "pen" || tool === "eraser" ? "cursor-crosshair" :
          tool === "text" ? "cursor-text" :
          tool === "select" ? "cursor-default" : "cursor-crosshair"
        }`}
      />
    </div>
  );
}

/* ── Drawing helpers ── */

function drawPath(ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const mid = {
      x: (points[i - 1].x + points[i].x) / 2,
      y: (points[i - 1].y + points[i].y) / 2,
    };
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: WhiteboardShape) {
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (shape.type) {
    case "path":
      if (shape.points) drawPath(ctx, shape.points, shape.color, shape.strokeWidth);
      break;
    case "rect":
      if (shape.x != null && shape.y != null && shape.width != null && shape.height != null) {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      }
      break;
    case "ellipse":
      if (shape.x != null && shape.y != null && shape.width != null && shape.height != null) {
        ctx.beginPath();
        ctx.ellipse(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
      }
      break;
    case "line":
      if (shape.points && shape.points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        ctx.lineTo(shape.points[1].x, shape.points[1].y);
        ctx.stroke();
      }
      break;
    case "text":
      if (shape.x != null && shape.y != null && shape.text) {
        ctx.font = `${shape.strokeWidth}px sans-serif`;
        ctx.fillText(shape.text, shape.x, shape.y + shape.strokeWidth);
      }
      break;
  }
}
