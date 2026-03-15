"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  FileText,
  Search,
  Settings,
  LogOut,
  ChevronDown,
  Trash2,
  Lock,
  Users,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Brain,
  Phone,
  Camera,
  Palette,
  Accessibility,
  ChevronRight,
} from "lucide-react";
import { useUser, useClerk, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter, useParams, usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScribbleIcon } from "@/components/ScribbleIcon";

export interface SidebarDocument {
  id: string;
  title: string;
  createdBy?: string | null;
  authorName?: string | null;
}

interface PresenceInfo {
  count: number;
  users: { name: string; avatar?: string; color: string }[];
}

interface SidebarProps {
  documents: SidebarDocument[];
  activeDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onOpenTrash: () => void;
  onTrashDocument: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  presence?: Record<string, PresenceInfo>;
}

function UserAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const { user } = useUser();
  const avatarColor = (user?.unsafeMetadata?.avatarColor as string) ?? "#6366f1";
  const hasCustomImage = user?.hasImage;
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
      "U"
    : "U";

  const sizeClass = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[9px]";

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white overflow-hidden shrink-0`}
      style={{ backgroundColor: hasCustomImage ? undefined : avatarColor }}
    >
      {hasCustomImage && user?.imageUrl ? (
        <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

interface WorkspaceEntry {
  id: string;
  name: string;
  slug: string;
  isPersonal?: boolean;
  orgId?: string | null;
}

function InviteTeamButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrCreateCode = useCallback(async () => {
    setLoading(true);
    try {
      // Try to create a new invite (or the endpoint can return existing)
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code);
      }
    } catch {}
    setLoading(false);
  }, [workspaceId]);

  const handleCopy = useCallback(() => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteCode]);

  return (
    <div className="px-3 pb-2 relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!inviteCode && !loading) fetchOrCreateCode();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-black/10 dark:border-white/10 px-3 py-1.5 text-[11px] font-medium text-black/40 dark:text-white/40 hover:border-black/20 dark:hover:border-white/20 hover:text-black/60 dark:hover:text-white/60 transition-colors"
      >
        <UserPlus className="h-3 w-3" />
        Invite Team
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-2">
              Invite Code
            </p>
            {loading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-black/20 dark:text-white/20" />
              </div>
            ) : inviteCode ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-black dark:text-white">
                    {inviteCode}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/8 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-black/30 dark:text-white/30 mt-2 text-center">
                  Share this code with your team members
                </p>
              </>
            ) : (
              <p className="text-[11px] text-black/40 dark:text-white/40 text-center py-2">
                Could not generate invite code
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onOpenTrash,
  onTrashDocument,
  collapsed,
  onToggleCollapse,
  presence,
}: SidebarProps) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { organization } = useOrganization();
  const { setActive } = useOrganizationList();
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [collapsedAuthors, setCollapsedAuthors] = useState<Set<string>>(new Set());
  const [textIntensity, setTextIntensity] = useState(0.85);
  const [fontScale, setFontScale] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Fetch workspaces
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) setWorkspaces(await res.json());
      } catch {}
    })();
  }, []);

  // Load accessibility preferences
  useEffect(() => {
    const ti = localStorage.getItem("textIntensity");
    if (ti) setTextIntensity(parseFloat(ti));
    const fs = localStorage.getItem("editorFontScale");
    if (fs) setFontScale(parseFloat(fs));
    const ls = localStorage.getItem("editorLineSpacing");
    if (ls) setLineSpacing(parseFloat(ls));
    setReduceMotion(localStorage.getItem("reduceMotion") === "true");
    setDyslexiaFont(localStorage.getItem("dyslexiaFont") === "true");
    setHighContrast(localStorage.getItem("highContrast") === "true");
  }, []);

  const updateA11y = useCallback((key: string, value: string) => {
    localStorage.setItem(key, value);
    const el = document.documentElement;
    if (key === "textIntensity") {
      el.style.setProperty("--text-intensity", value);
      setTextIntensity(parseFloat(value));
    } else if (key === "editorFontScale") {
      el.style.setProperty("--editor-font-scale", value);
      setFontScale(parseFloat(value));
    } else if (key === "editorLineSpacing") {
      el.style.setProperty("--editor-line-spacing", value);
      setLineSpacing(parseFloat(value));
    } else if (key === "reduceMotion") {
      const on = value === "true";
      setReduceMotion(on);
      el.classList.toggle("reduce-motion", on);
    } else if (key === "dyslexiaFont") {
      const on = value === "true";
      setDyslexiaFont(on);
      el.classList.toggle("dyslexia-font", on);
    } else if (key === "highContrast") {
      const on = value === "true";
      setHighContrast(on);
      el.classList.toggle("high-contrast", on);
    }
  }, []);

  const currentWorkspace = workspaces.find((w) => w.id === params?.workspaceId);
  const personalWorkspace = workspaces.find((w) => w.isPersonal);
  const teamWorkspaces = workspaces.filter((w) => !w.isPersonal);

  const handleDragStart = useCallback((e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData("text/plain", docId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(docId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverTrash(false);
  }, []);

  const handleTrashDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTrash(true);
  }, []);

  const handleTrashDragLeave = useCallback(() => {
    setDragOverTrash(false);
  }, []);

  const handleTrashDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const docId = e.dataTransfer.getData("text/plain");
      if (docId) onTrashDocument(docId);
      setDragOverTrash(false);
      setDraggingId(null);
    },
    [onTrashDocument]
  );

  const filtered = documents.filter((doc) =>
    (doc.title ?? "Untitled").toLowerCase().includes(search.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-black/8 dark:border-white/10 bg-white dark:bg-black py-3 gap-2">
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          onClick={onCreateDocument}
          title="New document"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <UserAvatar size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-black/8 dark:border-white/10 bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <ScribbleIcon size={18} className="text-black dark:text-white/90" />
          <h2 className="text-sm font-semibold text-black dark:text-white tracking-tight">
            MarkedUp
          </h2>
        </div>
        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-2 relative">
        <button
          onClick={() => setWsSwitcherOpen(!wsSwitcherOpen)}
          className="flex w-full items-center gap-2 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-xs text-black dark:text-white hover:border-black/20 dark:hover:border-white/25 transition-colors"
        >
          {currentWorkspace?.isPersonal ? (
            <Lock className="h-3.5 w-3.5 text-black/40 dark:text-white/40 shrink-0" />
          ) : (
            <Users className="h-3.5 w-3.5 text-black/40 dark:text-white/40 shrink-0" />
          )}
          <span className="truncate font-medium flex-1 text-left">
            {currentWorkspace?.name || "Workspace"}
          </span>
          {currentWorkspace?.isPersonal && (
            <span className="text-[9px] uppercase tracking-wider text-black/30 dark:text-white/30 shrink-0">
              Private
            </span>
          )}
          <ChevronDown className={`h-3 w-3 text-black/30 dark:text-white/30 shrink-0 transition-transform ${wsSwitcherOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Workspace dropdown */}
        {wsSwitcherOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setWsSwitcherOpen(false)} />
            <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up py-1">
              {/* Personal workspace */}
              {personalWorkspace && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[9px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                    Personal
                  </p>
                  <button
                    onClick={async () => {
                      if (setActive) await setActive({ organization: null });
                      router.push(`/${personalWorkspace.id}`);
                      setWsSwitcherOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      currentWorkspace?.id === personalWorkspace.id
                        ? "bg-black/5 dark:bg-white/5 text-black dark:text-white font-medium"
                        : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{personalWorkspace.name}</span>
                  </button>
                </>
              )}
              {/* Team workspaces */}
              {teamWorkspaces.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[9px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                    Team
                  </p>
                  {teamWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={async () => {
                        if (setActive && ws.orgId) await setActive({ organization: ws.orgId });
                        router.push(`/${ws.id}`);
                        setWsSwitcherOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                        currentWorkspace?.id === ws.id
                          ? "bg-black/5 dark:bg-white/5 text-black dark:text-white font-medium"
                          : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Wiki Overview button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => router.push(`/${params?.workspaceId}`)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all ${
            pathname === `/${params?.workspaceId}`
              ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white font-medium"
              : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
          }`}
        >
          <Brain className="h-3.5 w-3.5 shrink-0" />
          Business Wiki
        </button>
      </div>

      {/* Calls button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => router.push(`/${params?.workspaceId}/calls`)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all ${
            pathname === `/${params?.workspaceId}/calls`
              ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white font-medium"
              : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
          }`}
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          Calls
        </button>
      </div>

      {/* Group Settings button (only for non-personal workspaces) */}
      {currentWorkspace && !currentWorkspace.isPersonal && (
        <>
          <div className="px-3 pb-2">
            <button
              onClick={() => router.push(`/${params?.workspaceId}/settings`)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              Group Settings
            </button>
          </div>
          <InviteTeamButton workspaceId={currentWorkspace.id} />
        </>
      )}

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
          <input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] pl-8 pr-3 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
          />
        </div>
      </div>

      {/* New Document */}
      <div className="px-3 pb-2">
        <button
          onClick={onCreateDocument}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 hover:bg-black/[0.06] dark:hover:border-white/25 dark:hover:bg-white/[0.07] transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          New Document
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {(() => {
          const isTeam = currentWorkspace && !currentWorkspace.isPersonal;
          const hasAuthors = isTeam && filtered.some((d) => d.authorName);

          if (hasAuthors) {
            // Group documents by author
            const groups: Record<string, SidebarDocument[]> = {};
            const currentUserId = user?.id;
            for (const doc of filtered) {
              const key = doc.createdBy || "_unknown";
              if (!groups[key]) groups[key] = [];
              groups[key].push(doc);
            }
            // Sort: current user first, then alphabetically by author name
            const sortedKeys = Object.keys(groups).sort((a, b) => {
              if (a === currentUserId) return -1;
              if (b === currentUserId) return 1;
              const nameA = groups[a][0]?.authorName || "Unknown";
              const nameB = groups[b][0]?.authorName || "Unknown";
              return nameA.localeCompare(nameB);
            });

            const toggleAuthor = (authorId: string) => {
              setCollapsedAuthors((prev) => {
                const next = new Set(prev);
                if (next.has(authorId)) next.delete(authorId);
                else next.add(authorId);
                return next;
              });
            };

            return (
              <div className="space-y-1">
                {sortedKeys.map((authorId) => {
                  const docs = groups[authorId];
                  const authorName = authorId === currentUserId
                    ? "You"
                    : docs[0]?.authorName || "Unknown";
                  const isCollapsed = collapsedAuthors.has(authorId);

                  return (
                    <div key={authorId}>
                      <button
                        onClick={() => toggleAuthor(authorId)}
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-black/35 dark:text-white/35 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                      >
                        <ChevronRight className={`h-3 w-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                        <span className="truncate">{authorName}</span>
                        <span className="text-black/20 dark:text-white/20 ml-auto">{docs.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-0.5">
                          {docs.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => onSelectDocument(doc.id)}
                              draggable
                              onDragStart={(e) => handleDragStart(e, doc.id)}
                              onDragEnd={handleDragEnd}
                              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 pl-6 py-2 text-left text-sm transition-all duration-150 cursor-grab active:cursor-grabbing ${
                                draggingId === doc.id
                                  ? "opacity-40"
                                  : doc.id === activeDocumentId
                                    ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                                    : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate flex-1">{doc.title || "Untitled"}</span>
                              {presence?.[doc.id] && (
                                <span className="flex -space-x-1 shrink-0" title={presence[doc.id].users.map((u) => u.name).join(", ")}>
                                  {presence[doc.id].users.slice(0, 3).map((u, i) => (
                                    <span key={i} className="h-4 w-4 rounded-full border border-white dark:border-black flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: u.color, zIndex: 3 - i }}>
                                      {u.name[0]}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // Flat list for personal workspaces or when no author data
          return (
            <div className="space-y-0.5">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc.id)}
                  onDragEnd={handleDragEnd}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all duration-150 cursor-grab active:cursor-grabbing ${
                    draggingId === doc.id
                      ? "opacity-40"
                      : doc.id === activeDocumentId
                        ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                        : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{doc.title || "Untitled"}</span>
                  {presence?.[doc.id] && (
                    <span className="flex -space-x-1 shrink-0" title={presence[doc.id].users.map((u) => u.name).join(", ")}>
                      {presence[doc.id].users.slice(0, 3).map((u, i) => (
                        <span key={i} className="h-4 w-4 rounded-full border border-white dark:border-black flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: u.color, zIndex: 3 - i }}>
                          {u.name[0]}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-black/30 dark:text-white/30">
                  No documents found
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Trash — drop target */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenTrash}
          onDragOver={handleTrashDragOver}
          onDragLeave={handleTrashDragLeave}
          onDrop={handleTrashDrop}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all ${
            dragOverTrash
              ? "bg-red-500/10 text-red-500 dark:text-red-400 border border-dashed border-red-500/30 scale-[1.02]"
              : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <Trash2 className={`h-3.5 w-3.5 ${dragOverTrash ? "animate-bounce" : ""}`} />
          {dragOverTrash ? "Drop to trash" : "Trash"}
        </button>
      </div>

      {/* Footer: User profile + theme toggle */}
      <div className="border-t border-black/8 dark:border-white/10 px-3 py-2.5">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <UserAvatar size="md" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-black dark:text-white truncate">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                  : user?.emailAddresses[0]?.emailAddress ?? "Account"}
              </p>
              <p className="text-[10px] text-black/30 dark:text-white/30 truncate">
                {user?.emailAddresses[0]?.emailAddress ?? ""}
              </p>
            </div>
            <ChevronDown className={`h-3 w-3 text-black/30 dark:text-white/30 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl animate-fade-in-up py-1">
                <button
                  onClick={() => { openUserProfile(); setUserMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage account
                </button>

                {/* Avatar settings */}
                <button
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Palette className="h-3.5 w-3.5" />
                  Change avatar
                </button>
                {avatarMenuOpen && (
                  <div className="px-3 pb-2">
                    {/* Color picker */}
                    <p className="text-[9px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-1.5 mt-1">
                      Avatar color
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444",
                        "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6",
                        "#e11d48", "#84cc16", "#0ea5e9", "#a855f7", "#f43f5e",
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={async () => {
                            if (!user) return;
                            // If user has a custom photo, remove it so the color shows
                            if (user.hasImage) {
                              try {
                                await user.setProfileImage({ file: null });
                              } catch {}
                            }
                            await user.update({
                              unsafeMetadata: {
                                ...((user.unsafeMetadata as Record<string, unknown>) || {}),
                                avatarColor: color,
                              },
                            });
                          }}
                          className={`h-5 w-5 rounded-full transition-all ${
                            (user?.unsafeMetadata?.avatarColor as string) === color
                              ? "ring-2 ring-offset-1 ring-black/20 dark:ring-white/20 dark:ring-offset-black scale-110"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    {/* Upload photo */}
                    <label className="flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-black/50 dark:text-white/50 hover:border-black/20 dark:hover:border-white/20 hover:text-black dark:hover:text-white transition-colors cursor-pointer">
                      {uploadingAvatar ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                      {uploadingAvatar ? "Uploading..." : "Upload photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          setUploadingAvatar(true);
                          try {
                            await user.setProfileImage({ file });
                          } catch (err) {
                            console.error("Failed to upload avatar:", err);
                          }
                          setUploadingAvatar(false);
                        }}
                      />
                    </label>

                    {/* Remove photo */}
                    {user?.imageUrl && user.imageUrl.includes("clerk") && !user.imageUrl.includes("gravatar") && (
                      <button
                        onClick={async () => {
                          if (!user) return;
                          try {
                            await user.setProfileImage({ file: null });
                          } catch (err) {
                            console.error("Failed to remove avatar:", err);
                          }
                        }}
                        className="mt-1.5 flex items-center gap-2 text-[11px] text-red-500/60 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove photo
                      </button>
                    )}
                  </div>
                )}

                {/* Accessibility */}
                <button
                  onClick={() => setA11yOpen(!a11yOpen)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Accessibility className="h-3.5 w-3.5" />
                  Accessibility
                </button>
                {a11yOpen && (
                  <div className="px-3 pb-2 space-y-3">
                    {/* Text brightness */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Text brightness</span>
                        <span className="text-[10px] text-black/30 dark:text-white/30">{Math.round(textIntensity * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-black/25 dark:text-white/25">Dim</span>
                        <input
                          type="range" min="0.4" max="1" step="0.05" value={textIntensity}
                          onChange={(e) => updateA11y("textIntensity", e.target.value)}
                          className="flex-1 h-1 rounded-full appearance-none bg-black/10 dark:bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                        />
                        <span className="text-[9px] text-black/25 dark:text-white/25">Bright</span>
                      </div>
                    </div>

                    {/* Font size */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Font size</span>
                        <span className="text-[10px] text-black/30 dark:text-white/30">{Math.round(fontScale * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-black/25 dark:text-white/25">Small</span>
                        <input
                          type="range" min="0.8" max="1.5" step="0.05" value={fontScale}
                          onChange={(e) => updateA11y("editorFontScale", e.target.value)}
                          className="flex-1 h-1 rounded-full appearance-none bg-black/10 dark:bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                        />
                        <span className="text-[9px] text-black/25 dark:text-white/25">Large</span>
                      </div>
                    </div>

                    {/* Line spacing */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 font-medium">Line spacing</span>
                        <span className="text-[10px] text-black/30 dark:text-white/30">{lineSpacing === 1 ? "Normal" : `${Math.round(lineSpacing * 100)}%`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-black/25 dark:text-white/25">Tight</span>
                        <input
                          type="range" min="0.9" max="2" step="0.1" value={lineSpacing}
                          onChange={(e) => updateA11y("editorLineSpacing", e.target.value)}
                          className="flex-1 h-1 rounded-full appearance-none bg-black/10 dark:bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                        />
                        <span className="text-[9px] text-black/25 dark:text-white/25">Wide</span>
                      </div>
                    </div>

                    {/* Toggle options */}
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <span className="text-[11px] text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">Reduce motion</span>
                          <p className="text-[9px] text-black/25 dark:text-white/25">Minimize animations</p>
                        </div>
                        <button
                          onClick={() => updateA11y("reduceMotion", String(!reduceMotion))}
                          className={`relative w-7 h-4 rounded-full transition-colors ${reduceMotion ? "bg-black dark:bg-white" : "bg-black/15 dark:bg-white/15"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform ${reduceMotion ? "translate-x-3 bg-white dark:bg-black" : "bg-white dark:bg-white/60"}`} />
                        </button>
                      </label>

                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <span className="text-[11px] text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">High contrast</span>
                          <p className="text-[9px] text-black/25 dark:text-white/25">Maximum text visibility</p>
                        </div>
                        <button
                          onClick={() => updateA11y("highContrast", String(!highContrast))}
                          className={`relative w-7 h-4 rounded-full transition-colors ${highContrast ? "bg-black dark:bg-white" : "bg-black/15 dark:bg-white/15"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform ${highContrast ? "translate-x-3 bg-white dark:bg-black" : "bg-white dark:bg-white/60"}`} />
                        </button>
                      </label>

                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <span className="text-[11px] text-black/60 dark:text-white/60 group-hover:text-black dark:group-hover:text-white transition-colors">Dyslexia-friendly font</span>
                          <p className="text-[9px] text-black/25 dark:text-white/25">Wider letter shapes</p>
                        </div>
                        <button
                          onClick={() => updateA11y("dyslexiaFont", String(!dyslexiaFont))}
                          className={`relative w-7 h-4 rounded-full transition-colors ${dyslexiaFont ? "bg-black dark:bg-white" : "bg-black/15 dark:bg-white/15"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform ${dyslexiaFont ? "translate-x-3 bg-white dark:bg-black" : "bg-white dark:bg-white/60"}`} />
                        </button>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-black/40 dark:text-white/40">Theme</span>
                  <ThemeToggle />
                </div>
                <div className="border-t border-black/6 dark:border-white/6 my-1" />
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
                <button
                  onClick={() => { router.push("/account/delete"); setUserMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-500/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete account
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
