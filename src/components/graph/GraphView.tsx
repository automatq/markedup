"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Loader2, GitBranch } from "lucide-react";

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type?: string;
  parentId?: string | null;
  connections?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  type?: "parent" | "backlink";
}

interface GraphViewProps {
  open: boolean;
  onClose: () => void;
  workspaceId?: string;
  activeNodeId?: string;
  onNodeClick: (id: string) => void;
}

/* ───── Physics constants ───── */
const REPULSION = 4500;
const ATTRACTION = 0.006;
const CENTER_GRAVITY = 0.01;
const DAMPING = 0.88;
const REST_LENGTH = 160;
const MIN_DIST = 40;

/* ───── Visual constants ───── */
const BASE_RADIUS = 8;
const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function getNodeColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function getNodeRadius(connections: number): number {
  return BASE_RADIUS + Math.min(connections * 2, 12);
}

/* ───── Force simulation ───── */
function runSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 200
): GraphNode[] {
  const result = nodes.map((n, i) => ({
    ...n,
    // Spread nodes in a spiral for better initial layout
    x: Math.cos((i / Math.max(nodes.length, 1)) * Math.PI * 2 * 1.5) * Math.min(width, height) * 0.25,
    y: Math.sin((i / Math.max(nodes.length, 1)) * Math.PI * 2 * 1.5) * Math.min(width, height) * 0.25,
    vx: 0,
    vy: 0,
  }));

  // Build adjacency for faster lookup
  const adjacency = new Map<string, Set<string>>();
  for (const n of result) adjacency.set(n.id, new Set());
  for (const e of edges) {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations; // Cooling

    // Repulsion between all pairs
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
        const force = (REPULSION * temp) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        result[i].vx -= fx;
        result[i].vy -= fy;
        result[j].vx += fx;
        result[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const src = result.find((n) => n.id === edge.source);
      const tgt = result.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - REST_LENGTH) * ATTRACTION;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Center gravity
    for (const node of result) {
      node.vx -= node.x * CENTER_GRAVITY;
      node.vy -= node.y * CENTER_GRAVITY;
    }

    // Apply velocity with damping
    for (const node of result) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return result;
}

/* ───── Main component ───── */
export function GraphView({
  open,
  onClose,
  workspaceId,
  activeNodeId,
  onNodeClick,
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDragging = useRef(false);
  const dragNode = useRef<string | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const nodesRef = useRef<GraphNode[]>([]);
  nodesRef.current = nodes;

  // Fetch graph data from API
  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/graph?workspaceId=${workspaceId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Count connections per node
        const connCount = new Map<string, number>();
        for (const e of data.edges) {
          connCount.set(e.source, (connCount.get(e.source) || 0) + 1);
          connCount.set(e.target, (connCount.get(e.target) || 0) + 1);
        }

        const graphNodes: GraphNode[] = data.nodes.map((n: any, i: number) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          parentId: n.parentId,
          connections: connCount.get(n.id) || 0,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
        }));

        const canvas = canvasRef.current;
        const w = canvas ? canvas.clientWidth : 800;
        const h = canvas ? canvas.clientHeight : 600;

        const simulated = runSimulation(graphNodes, data.edges, w, h);
        setNodes(simulated);
        setEdges(data.edges);
        setOffset({ x: 0, y: 0 });
        setZoom(1);
      } catch (err) {
        console.error("Failed to fetch graph:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, workspaceId]);

  // Screen-to-world coordinate conversion
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cx = (sx - rect.left) * dpr;
      const cy = (sy - rect.top) * dpr;
      return {
        x: (cx - canvas.width / 2) / zoom - offset.x,
        y: (cy - canvas.height / 2) / zoom - offset.y,
      };
    },
    [zoom, offset]
  );

  // Find node at position
  const nodeAtPos = useCallback(
    (wx: number, wy: number): GraphNode | null => {
      for (const node of nodesRef.current) {
        const r = getNodeRadius(node.connections || 0) + 4;
        const dx = node.x - wx;
        const dy = node.y - wy;
        if (dx * dx + dy * dy < r * r) return node;
      }
      return null;
    },
    []
  );

  /* ───── Drawing ───── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = document.documentElement.classList.contains("dark");

    // Background
    ctx.fillStyle = isDark ? "#050505" : "#fafafa";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(offset.x, offset.y);

    const gridSize = 50;
    const gridAlpha = isDark ? 0.04 : 0.06;
    ctx.strokeStyle = isDark ? `rgba(255,255,255,${gridAlpha})` : `rgba(0,0,0,${gridAlpha})`;
    ctx.lineWidth = 0.5;
    const viewW = w / zoom;
    const viewH = h / zoom;
    const startX = Math.floor((-offset.x - viewW / 2) / gridSize) * gridSize;
    const startY = Math.floor((-offset.y - viewH / 2) / gridSize) * gridSize;
    for (let x = startX; x < -offset.x + viewW / 2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -offset.y - viewH / 2);
      ctx.lineTo(x, -offset.y + viewH / 2);
      ctx.stroke();
    }
    for (let y = startY; y < -offset.y + viewH / 2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-offset.x - viewW / 2, y);
      ctx.lineTo(-offset.x + viewW / 2, y);
      ctx.stroke();
    }

    // Draw edges
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const isParent = edge.type === "parent";
      const isHighlighted =
        hoveredNode === src.id ||
        hoveredNode === tgt.id ||
        activeNodeId === src.id ||
        activeNodeId === tgt.id;

      ctx.beginPath();

      if (isParent) {
        // Curved parent-child edges
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const cx = mx - dy * 0.15;
        const cy = my + dx * 0.15;
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo(cx, cy, tgt.x, tgt.y);
      } else {
        // Dashed backlink edges
        ctx.setLineDash([4, 4]);
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
      }

      if (isHighlighted) {
        ctx.strokeStyle = isParent
          ? isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)"
          : isDark ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.4)";
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow for parent edges
      if (isParent) {
        const tgtR = getNodeRadius(tgt.connections || 0);
        const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
        const arrowX = tgt.x - Math.cos(angle) * (tgtR + 4);
        const arrowY = tgt.y - Math.sin(angle) * (tgtR + 4);
        const arrowSize = 5;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = isHighlighted
          ? isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)"
          : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
        ctx.fill();
      }
    }

    // Draw nodes
    nodes.forEach((node, i) => {
      const isActive = node.id === activeNodeId;
      const isHovered = node.id === hoveredNode;
      const isConnectedToHovered =
        hoveredNode &&
        edges.some(
          (e) =>
            (e.source === hoveredNode && e.target === node.id) ||
            (e.target === hoveredNode && e.source === node.id)
        );
      const r = getNodeRadius(node.connections || 0);
      const color = getNodeColor(i);
      const dimmed = hoveredNode && !isHovered && !isConnectedToHovered && !isActive;

      // Outer glow
      if (isActive || isHovered) {
        const gradient = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 3);
        gradient.addColorStop(0, `${color}33`);
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (dimmed) {
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
      } else if (isActive) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
      } else if (isHovered) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = `${color}88`;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border ring
      if (isActive || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}44`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Type icon inside node (letter)
      if (r >= 10) {
        const letter =
          node.type === "spreadsheet" ? "S" :
          node.type === "markerboard" ? "M" :
          "D";
        ctx.font = `bold ${Math.max(8, r * 0.9)}px var(--ui-font, system-ui, sans-serif)`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = dimmed
          ? "transparent"
          : (isActive || isHovered)
            ? "rgba(255,255,255,0.95)"
            : "rgba(255,255,255,0.7)";
        ctx.fillText(letter, node.x, node.y + 0.5);
      }

      // Label
      const label = node.title || "Untitled";
      const maxLabelLen = 22;
      const displayLabel = label.length > maxLabelLen ? label.slice(0, maxLabelLen) + "..." : label;

      ctx.font = `500 11px var(--ui-font, system-ui, sans-serif)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      if (dimmed) {
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
      } else if (isActive || isHovered) {
        // Label background pill
        const textWidth = ctx.measureText(displayLabel).width;
        const px = 6;
        const py = 3;
        const bgY = node.y + r + 6;
        ctx.fillStyle = isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)";
        ctx.beginPath();
        const pillR = 4;
        const pillX = node.x - textWidth / 2 - px;
        const pillW = textWidth + px * 2;
        const pillH = 14 + py * 2;
        ctx.roundRect(pillX, bgY - py, pillW, pillH, pillR);
        ctx.fill();

        ctx.fillStyle = isDark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)";
        ctx.fillText(displayLabel, node.x, bgY);
      } else {
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
        ctx.fillText(displayLabel, node.x, node.y + r + 8);
      }
    });

    ctx.restore();
  }, [nodes, edges, zoom, offset, activeNodeId, hoveredNode]);

  // Animation loop
  useEffect(() => {
    if (!open) return;
    const loop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [open, draw]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  // Scroll to zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom((z) => Math.max(0.2, Math.min(4, z * factor)));
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [open]);

  /* ───── Mouse handlers ───── */
  const handleMouseDown = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const node = nodeAtPos(world.x, world.y);
    if (node) {
      dragNode.current = node.id;
    } else {
      isDragging.current = true;
    }
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);

    if (dragNode.current) {
      // Drag node position
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragNode.current ? { ...n, x: world.x, y: world.y } : n
        )
      );
      return;
    }

    if (isDragging.current) {
      const dpr = window.devicePixelRatio || 1;
      setOffset((prev) => ({
        x: prev.x + ((e.clientX - lastMouse.current.x) * dpr) / zoom,
        y: prev.y + ((e.clientY - lastMouse.current.y) * dpr) / zoom,
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover detection
    const found = nodeAtPos(world.x, world.y);
    setHoveredNode(found?.id || null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragNode.current) {
      // If it was a click (not a drag), select the node
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        onNodeClick(dragNode.current);
      }
      dragNode.current = null;
      return;
    }
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    dragNode.current = null;
    setHoveredNode(null);
  };

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-[90vw] max-w-5xl h-[80vh] rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl animate-fade-in-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/6 dark:border-white/8 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <GitBranch className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Knowledge Graph
              </h2>
              <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">
                {nodes.length} pages{edges.length > 0 ? `, ${edges.length} connections` : ""} — drag to pan, scroll to zoom, drag nodes to rearrange
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 mr-4 text-[10px] text-black/40 dark:text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-px bg-indigo-500/50" />
                parent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-px border-t border-dashed border-purple-500/50" />
                backlink
              </span>
            </div>

            <button
              onClick={() => setZoom((z) => Math.min(z * 1.3, 4))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.3, 0.2))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={resetView}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Reset view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-4 bg-black/8 dark:bg-white/8 mx-1" />
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-xs text-black/40 dark:text-white/40">Building graph...</p>
              </div>
            </div>
          )}

          {!loading && nodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <GitBranch className="h-10 w-10 text-black/10 dark:text-white/10" />
                <p className="text-sm text-black/40 dark:text-white/40">No documents yet</p>
                <p className="text-[11px] text-black/25 dark:text-white/25 max-w-xs">
                  Create documents and nest them to see your knowledge graph come alive
                </p>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ cursor: hoveredNode ? "pointer" : undefined }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />

          {/* Zoom indicator */}
          <div className="absolute bottom-3 left-3 text-[10px] text-black/25 dark:text-white/25 select-none">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
