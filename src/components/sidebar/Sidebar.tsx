"use client";

import React, { useCallback, useState } from "react";
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
} from "lucide-react";
import { useUser, useClerk, useOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScribbleIcon } from "@/components/ScribbleIcon";

export interface SidebarDocument {
  id: string;
  title: string;
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
}

function UserAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const { user } = useUser();
  const avatarColor = (user?.unsafeMetadata?.avatarColor as string) ?? "#6366f1";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
      "U"
    : "U";

  const sizeClass = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[9px]";

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white overflow-hidden shrink-0`}
      style={{ backgroundColor: user?.imageUrl ? undefined : avatarColor }}
    >
      {user?.imageUrl ? (
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

export function Sidebar({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onOpenTrash,
  onTrashDocument,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { organization } = useOrganization();
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);

  // Fetch workspaces
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) setWorkspaces(await res.json());
      } catch {}
    })();
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
                    onClick={() => {
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
                      onClick={() => {
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
              <span className="truncate">{doc.title || "Untitled"}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-black/30 dark:text-white/30">
              No documents found
            </p>
          )}
        </div>
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
