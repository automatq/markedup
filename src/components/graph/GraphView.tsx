"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface GraphViewProps {
  open: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeNodeId?: string;
  onNodeClick: (id: string) => void;
}

const NODE_RADIUS = 6;
const REPULSION = 3000;
const ATTRACTION = 0.005;
const DAMPING = 0.85;
const REST_LENGTH = 120;

function forceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  iterations = 100
): GraphNode[] {
  const result = nodes.map((n) => ({ ...n }));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
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

    // Apply velocity
    for (const node of result) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return result;
}

export function GraphView({
  open,
  onClose,
  nodes: initialNodes,
  edges,
  activeNodeId,
  onNodeClick,
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || initialNodes.length === 0) return;
    const simulated = forceSimulation(initialNodes, edges);
    setNodes(simulated);

    // Center the graph
    const cx = simulated.reduce((s, n) => s + n.x, 0) / simulated.length;
    const cy = simulated.reduce((s, n) => s + n.y, 0) / simulated.length;
    setOffset({ x: -cx, y: -cy });
    setZoom(1);
  }, [open, initialNodes, edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = document.documentElement.classList.contains("dark");

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(offset.x, offset.y);

    // Draw edges
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const isActive = node.id === activeNodeId;
      const isHovered = node.id === hoveredNode;
      const r = isActive ? NODE_RADIUS + 2 : isHovered ? NODE_RADIUS + 1 : NODE_RADIUS;

      // Glow for active
      if (isActive) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive
        ? isDark ? "#ffffff" : "#000000"
        : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
      ctx.fill();

      // Label
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = isActive || isHovered
        ? isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)"
        : isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
      ctx.fillText(node.title, node.x, node.y + r + 14);
    }

    ctx.restore();
  }, [nodes, edges, zoom, offset, activeNodeId, hoveredNode]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * 2;
      canvas.height = canvas.clientHeight * 2;
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      setOffset((prev) => ({
        x: prev.x + (e.clientX - lastMouse.current.x) / zoom,
        y: prev.y + (e.clientY - lastMouse.current.y) / zoom,
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) * 2 - canvas.width / 2) / zoom - offset.x * 2;
    const my = ((e.clientY - rect.top) * 2 - canvas.height / 2) / zoom - offset.y * 2;

    for (const node of nodes) {
      const dx = node.x * 2 - mx;
      const dy = node.y * 2 - my;
      if (Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS * 4) {
        onNodeClick(node.id);
        return;
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl h-[70vh] mx-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Graph View
            </h2>
            <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">
              {nodes.length} nodes, {edges.length} connections
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.2, 0.3))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 w-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}
