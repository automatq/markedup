"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Users,
  Crown,
  Trash2,
  Check,
} from "lucide-react";

interface GroupMember {
  userId: string;
  name: string;
  avatar: string | null;
}

interface OwnedGroup {
  orgId: string;
  workspaceId: string;
  name: string;
  memberCount: number;
  members: GroupMember[];
}

type GroupAction = {
  orgId: string;
  action: "transfer" | "delete";
  newOwnerId?: string;
};

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [loading, setLoading] = useState(true);
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[]>([]);
  const [actions, setActions] = useState<Record<string, GroupAction>>({});
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // Fetch owned groups on mount
  useEffect(() => {
    if (!isLoaded || !user) return;
    (async () => {
      try {
        const res = await fetch("/api/account/delete");
        if (res.ok) {
          const data = await res.json();
          setOwnedGroups(data.ownedGroups);
        } else {
          setError("Failed to load account data. Please try again.");
        }
      } catch {
        setError("Failed to connect. Please check your connection and try again.");
      }
      setLoading(false);
    })();
  }, [isLoaded, user]);

  const allGroupsResolved = ownedGroups.every((g) => {
    const action = actions[g.orgId];
    if (!action) return false;
    if (action.action === "transfer" && !action.newOwnerId) return false;
    return true;
  });

  const canDelete = allGroupsResolved && confirmText === "DELETE";

  const setGroupAction = useCallback(
    (orgId: string, action: "transfer" | "delete", newOwnerId?: string) => {
      setActions((prev) => ({
        ...prev,
        [orgId]: { orgId, action, newOwnerId },
      }));
    },
    []
  );

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: Object.values(actions) }),
      });

      if (res.ok) {
        await signOut();
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch {
      setError("Something went wrong");
      setDeleting(false);
    }
  }, [canDelete, actions, signOut, router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-black/20 dark:text-white/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-lg px-4 py-12">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">
            Delete Account
          </h1>
        </div>
        <p className="text-sm text-black/40 dark:text-white/40 mb-8 ml-[52px]">
          This will permanently delete your account, personal workspace, and all your data. This cannot be undone.
        </p>

        {/* Owned groups that need resolution */}
        {ownedGroups.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-1">
              You own {ownedGroups.length} group{ownedGroups.length > 1 ? "s" : ""}
            </h2>
            <p className="text-xs text-black/40 dark:text-white/40 mb-4">
              Choose what happens to each group before deleting your account.
            </p>

            <div className="space-y-4">
              {ownedGroups.map((group) => (
                <GroupCard
                  key={group.orgId}
                  group={group}
                  action={actions[group.orgId]}
                  onSetAction={setGroupAction}
                />
              ))}
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Confirmation */}
        <section className="rounded-xl border border-red-200/50 dark:border-red-500/10 bg-red-50/50 dark:bg-red-500/5 p-5">
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">
            Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm:
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="h-10 w-full rounded-lg border border-red-200 dark:border-red-500/20 bg-white dark:bg-black px-4 text-sm font-mono text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 outline-none focus:border-red-400 dark:focus:border-red-500/40 transition-colors"
          />

          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Permanently delete my account
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  action,
  onSetAction,
}: {
  group: OwnedGroup;
  action?: GroupAction;
  onSetAction: (orgId: string, action: "transfer" | "delete", newOwnerId?: string) => void;
}) {
  const hasOtherMembers = group.members.length > 0;
  const selectedAction = action?.action;

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/10 p-4">
      {/* Group header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
          <Users className="h-4 w-4 text-black/50 dark:text-white/50" />
        </div>
        <div>
          <p className="text-sm font-semibold text-black dark:text-white">{group.name}</p>
          <p className="text-[11px] text-black/40 dark:text-white/40">
            {group.memberCount === 0
              ? "Only you"
              : `${group.memberCount} other member${group.memberCount !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Action choices */}
      <div className="space-y-2">
        {hasOtherMembers && (
          <button
            onClick={() => onSetAction(group.orgId, "transfer")}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
              selectedAction === "transfer"
                ? "border-black/20 dark:border-white/20 bg-black/[0.03] dark:bg-white/[0.03]"
                : "border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15"
            }`}
          >
            <Crown className={`h-4 w-4 shrink-0 ${selectedAction === "transfer" ? "text-amber-500" : "text-black/30 dark:text-white/30"}`} />
            <div className="flex-1">
              <p className="text-xs font-medium text-black dark:text-white">Transfer ownership</p>
              <p className="text-[10px] text-black/40 dark:text-white/40">Appoint a new admin to keep the group running</p>
            </div>
            {selectedAction === "transfer" && <Check className="h-4 w-4 text-black dark:text-white shrink-0" />}
          </button>
        )}

        <button
          onClick={() => onSetAction(group.orgId, "delete")}
          className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
            selectedAction === "delete"
              ? "border-red-300 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5"
              : "border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15"
          }`}
        >
          <Trash2 className={`h-4 w-4 shrink-0 ${selectedAction === "delete" ? "text-red-500" : "text-black/30 dark:text-white/30"}`} />
          <div className="flex-1">
            <p className="text-xs font-medium text-black dark:text-white">Delete group</p>
            <p className="text-[10px] text-black/40 dark:text-white/40">
              Remove the group and all its data for everyone
            </p>
          </div>
          {selectedAction === "delete" && <Check className="h-4 w-4 text-red-500 shrink-0" />}
        </button>
      </div>

      {/* Member picker for transfer */}
      {selectedAction === "transfer" && (
        <div className="mt-3 border-t border-black/6 dark:border-white/6 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-2">
            Choose new admin
          </p>
          <div className="space-y-1">
            {group.members.map((member) => (
              <button
                key={member.userId}
                onClick={() => onSetAction(group.orgId, "transfer", member.userId)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                  action?.newOwnerId === member.userId
                    ? "bg-black/5 dark:bg-white/5"
                    : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                }`}
              >
                {member.avatar ? (
                  <img src={member.avatar} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[9px] font-medium text-black/50 dark:text-white/50">
                    {member.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-black dark:text-white flex-1 truncate">{member.name}</span>
                {action?.newOwnerId === member.userId && (
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
