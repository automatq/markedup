"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  Plus,
  Circle,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";

interface Task {
  id: string;
  documentId: string;
  sortOrder: number;
  title: string;
  description: string | null;
  status: string;
  agentConfigId: string | null;
  assignedTo: string | null;
  blockedBy: string[];
  dueDate: string | null;
  completedAt: string | null;
}

interface ExecutionPlanPanelProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  not_started: {
    icon: <Circle className="h-3.5 w-3.5" />,
    label: "Not Started",
    color: "text-black/40 dark:text-white/40",
  },
  in_progress: {
    icon: <PlayCircle className="h-3.5 w-3.5" />,
    label: "In Progress",
    color: "text-blue-500",
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Completed",
    color: "text-emerald-500",
  },
  blocked: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: "Blocked",
    color: "text-red-500",
  },
};

const STATUS_ORDER = ["not_started", "in_progress", "completed", "blocked"];

export function ExecutionPlanPanel({ open, onClose, documentId }: ExecutionPlanPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const fetchTasks = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/execution-plan/tasks?documentId=${documentId}`);
      if (res.ok) setTasks(await res.json());
    } catch {}
    setLoading(false);
  }, [documentId]);

  useEffect(() => {
    if (open) fetchTasks();
  }, [open, fetchTasks]);

  const addTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    try {
      const res = await fetch("/api/execution-plan/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, title }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [...prev, task]);
      }
    } catch {}
  }, [documentId, newTitle]);

  const updateTask = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/execution-plan/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    } catch {}
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await fetch(`/api/execution-plan/tasks?id=${id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }, []);

  const cycleStatus = useCallback(
    (task: Task) => {
      const idx = STATUS_ORDER.indexOf(task.status);
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
      updateTask(task.id, { status: next });
    },
    [updateTask]
  );

  if (!open) return null;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="w-80 shrink-0 border-l border-black/8 dark:border-white/10 bg-white dark:bg-black flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">Execution Plan</h2>
          <p className="text-[10px] text-black/30 dark:text-white/30 mt-0.5">
            {completed}/{total} tasks complete
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-black/6 dark:border-white/6">
        <div className="flex items-center justify-between text-[10px] text-black/40 dark:text-white/40 mb-1">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-black/6 dark:border-white/6">
        {[
          { key: "all", label: "All" },
          { key: "in_progress", label: "Active" },
          { key: "blocked", label: "Blocked" },
          { key: "completed", label: "Done" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
              filter === f.key
                ? "bg-black/[0.06] dark:bg-white/[0.06] text-black dark:text-white font-medium"
                : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <p className="text-xs text-black/30 dark:text-white/30 text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30 text-center py-8">
            {filter === "all" ? "No tasks yet. Add one below." : "No matching tasks."}
          </p>
        ) : (
          filtered.map((task) => {
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.not_started;
            return (
              <div
                key={task.id}
                className="group flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
              >
                <button
                  onClick={() => cycleStatus(task)}
                  className={`mt-0.5 shrink-0 ${cfg.color} hover:opacity-70 transition-opacity`}
                  title={`Status: ${cfg.label} — click to cycle`}
                >
                  {cfg.icon}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      task.status === "completed"
                        ? "line-through text-black/30 dark:text-white/30"
                        : "text-black/70 dark:text-white/70"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[10px] text-black/30 dark:text-white/30 mt-0.5 truncate">
                      {task.description}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-[9px] text-black/25 dark:text-white/25 mt-0.5">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-black/20 dark:text-white/20 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add task form */}
      <div className="px-3 py-2.5 border-t border-black/8 dark:border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder="New task..."
            className="flex-1 text-sm bg-black/[0.03] dark:bg-white/[0.03] rounded-lg px-3 py-1.5 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-colors"
          />
          <button
            onClick={addTask}
            disabled={!newTitle.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.05] dark:bg-white/[0.05] text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white disabled:opacity-30 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
