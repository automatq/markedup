"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Upload,
  Loader2,
  Phone,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Check,
  BarChart3,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CallLog {
  id: string;
  title: string;
  transcript: string;
  summary: string | null;
  actionItems: string | null;
  outcome: string | null;
  score: number | null;
  durationSecs: number | null;
  tags: string | null;
  documentId: string | null;
  createdBy: string;
  createdAt: string;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function OutcomeIcon({ outcome }: { outcome: string | null }) {
  if (outcome === "positive") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (outcome === "negative") return <XCircle className="h-4 w-4 text-red-500" />;
  return <MinusCircle className="h-4 w-4 text-black/25 dark:text-white/25" />;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 70
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : score >= 40
        ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
        : "text-red-600 dark:text-red-400 bg-red-500/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

/* ── Audio Recorder ── */
function AudioRecorder({
  onRecorded,
}: {
  onRecorded: (blob: Blob, duration: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        onRecorded(blob, duration);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, [onRecorded]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {recording ? (
        <>
          <button
            onClick={stop}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            <MicOff className="h-4 w-4" />
            Stop Recording
          </button>
          <div className="flex items-center gap-2 text-sm text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {formatDuration(elapsed)}
          </div>
        </>
      ) : (
        <button
          onClick={start}
          className="flex h-10 items-center gap-2 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
        >
          <Mic className="h-4 w-4" />
          Record Call
        </button>
      )}
    </div>
  );
}

/* ── Call Card ── */
function CallCard({
  call,
  workspaceId,
  onDelete,
  onSaved,
}: {
  call: CallLog;
  workspaceId: string;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!call.documentId);

  const handleSaveAsDoc = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/calls/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id, workspaceId }),
      });
      if (res.ok) {
        const { document } = await res.json();
        setSaved(true);
        onSaved();
        // Navigate to the new document
        router.push(`/${workspaceId}/${document.id}`);
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-black/6 dark:border-white/8 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <OutcomeIcon outcome={call.outcome} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black dark:text-white truncate">
            {call.title}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-black/35 dark:text-white/35">
              {new Date(call.createdAt).toLocaleDateString()}
            </span>
            {call.durationSecs && (
              <span className="text-[10px] text-black/35 dark:text-white/35 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(call.durationSecs)}
              </span>
            )}
            {call.tags && (
              <div className="flex gap-1">
                {call.tags.split(",").slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <ScoreBadge score={call.score} />
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-black/25 dark:text-white/25 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-black/25 dark:text-white/25 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-black/6 dark:border-white/8 px-4 py-4 space-y-4">
          {/* Summary */}
          {call.summary && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1">
                Summary
              </p>
              <p className="text-xs text-black/70 dark:text-white/60 leading-relaxed">
                {call.summary}
              </p>
            </div>
          )}

          {/* Action Items */}
          {call.actionItems && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1">
                Action Items
              </p>
              <div className="prose prose-sm dark:prose-invert max-w-none [&_li]:text-xs [&_li]:leading-relaxed [&_ul]:my-0 [&_p]:text-xs">
                <ReactMarkdown>{call.actionItems}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Transcript (collapsible) */}
          <details className="group">
            <summary className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium cursor-pointer hover:text-black/50 dark:hover:text-white/50 transition-colors">
              Transcript
            </summary>
            <p className="mt-2 text-xs text-black/50 dark:text-white/40 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
              {call.transcript}
            </p>
          </details>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSaveAsDoc}
              disabled={saving || saved}
              className="flex items-center gap-1.5 rounded-lg border border-black/8 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors disabled:opacity-40"
            >
              {saved ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Saved as doc</span>
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  Save as Document
                </>
              )}
            </button>
            <button
              onClick={() => onDelete(call.id)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-500/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function CallsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId ?? "";

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBlob, setPendingBlob] = useState<{
    blob: Blob;
    duration: number;
  } | null>(null);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/calls?workspaceId=${workspaceId}`);
      if (res.ok) setCalls(await res.json());
    } catch {}
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Upload and process audio
  const processAudio = useCallback(
    async (file: File | Blob, title: string) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("workspaceId", workspaceId);
        formData.append("title", title || "Call Recording");

        const res = await fetch("/api/calls", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          await fetchCalls();
          setUploadTitle("");
          setPendingBlob(null);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
      setUploading(false);
    },
    [workspaceId, fetchCalls]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processAudio(file, uploadTitle || file.name.replace(/\.[^.]+$/, ""));
    },
    [processAudio, uploadTitle]
  );

  const handleRecorded = useCallback(
    (blob: Blob, duration: number) => {
      setPendingBlob({ blob, duration });
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/calls?id=${id}`, { method: "DELETE" });
      setCalls((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  }, []);

  // KPIs
  const totalCalls = calls.length;
  const scoredCalls = calls.filter((c) => c.score !== null);
  const avgScore =
    scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.score ?? 0), 0) / scoredCalls.length)
      : null;
  const positiveCalls = calls.filter((c) => c.outcome === "positive").length;
  const successRate =
    totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : null;
  const totalDuration = calls.reduce((sum, c) => sum + (c.durationSecs ?? 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-black/30 dark:text-white/30 mb-3">
            <Phone className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-medium">
              Call Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white tracking-tight">
            Call Tracker
          </h1>
          <p className="text-sm text-black/40 dark:text-white/40 mt-1">
            Record or upload calls. AI transcribes, summarizes, and scores them automatically.
          </p>
        </div>

        {/* KPI Cards */}
        {totalCalls > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3 w-3 text-black/30 dark:text-white/30" />
                <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
                  Total Calls
                </span>
              </div>
              <p className="text-xl font-bold text-black dark:text-white">
                {totalCalls}
              </p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3 w-3 text-black/30 dark:text-white/30" />
                <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
                  Success Rate
                </span>
              </div>
              <p className="text-xl font-bold text-black dark:text-white">
                {successRate !== null ? `${successRate}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3 w-3 text-black/30 dark:text-white/30" />
                <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
                  Avg Score
                </span>
              </div>
              <p className="text-xl font-bold text-black dark:text-white">
                {avgScore !== null ? avgScore : "—"}
                <span className="text-xs font-normal text-black/30 dark:text-white/30">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-black/30 dark:text-white/30" />
                <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
                  Total Time
                </span>
              </div>
              <p className="text-xl font-bold text-black dark:text-white">
                {formatDuration(totalDuration)}
              </p>
            </div>
          </div>
        )}

        {/* Upload / Record Section */}
        <div className="rounded-xl border border-black/6 dark:border-white/8 p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
              New Call
            </span>
          </div>

          {/* Title input */}
          <input
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Call title (e.g. Discovery — Acme Corp)"
            className="h-10 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-sm text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors mb-3"
          />

          <div className="flex items-center gap-3 flex-wrap">
            {/* Record */}
            <AudioRecorder onRecorded={handleRecorded} />

            {/* File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-10 items-center gap-2 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors disabled:opacity-40"
            >
              <Upload className="h-4 w-4" />
              Upload Audio
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4"
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-black/40 dark:text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcribing & analyzing…
              </div>
            )}
          </div>

          {/* Pending recording */}
          {pendingBlob && !uploading && (
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/6 dark:border-white/6 px-4 py-3">
              <Mic className="h-4 w-4 text-black/40 dark:text-white/40" />
              <span className="text-xs text-black/60 dark:text-white/60 flex-1">
                Recording ready ({formatDuration(pendingBlob.duration)})
              </span>
              <button
                onClick={() =>
                  processAudio(
                    pendingBlob.blob,
                    uploadTitle || `Call ${new Date().toLocaleString()}`
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-black dark:bg-white px-4 py-1.5 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
              >
                <Sparkles className="h-3 w-3" />
                Transcribe & Analyze
              </button>
              <button
                onClick={() => setPendingBlob(null)}
                className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
              >
                Discard
              </button>
            </div>
          )}
        </div>

        {/* Call Log */}
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            Call Log
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-black/20 dark:text-white/20" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-8 w-8 text-black/15 dark:text-white/15 mx-auto mb-3" />
              <p className="text-sm text-black/30 dark:text-white/30">
                No calls yet. Record or upload your first call.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  workspaceId={workspaceId}
                  onDelete={handleDelete}
                  onSaved={fetchCalls}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
