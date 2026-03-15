"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  UserPlus,
  Loader2,
  Check,
  User,
  Camera,
} from "lucide-react";
import { ScribbleIcon } from "@/components/ScribbleIcon";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { setActive } = useOrganizationList();

  const needsProfile = isLoaded && user && !user.firstName;

  // Steps: 0=profile (if needed), 1=choose path, 2=create/join
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarColor, setAvatarColor] = useState("#6366f1");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Create path state
  const [path, setPath] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");

  // Join path state
  const [inviteCode, setInviteCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    code: string;
    workspace: { id: string; name: string };
    orgId: string;
  } | null>(null);

  // Skip profile step if user already has a name
  useEffect(() => {
    if (isLoaded && user?.firstName && step === 0) {
      setStep(1);
    }
  }, [isLoaded, user?.firstName, step]);

  // Check if user already has workspaces — if so, skip onboarding
  useEffect(() => {
    if (!isLoaded || !user) return;

    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const workspaces = await res.json();
          const teamWs = workspaces.find((w: any) => !w.isPersonal);
          if (teamWs) {
            router.replace(`/${teamWs.id}`);
            return;
          }
          if (workspaces.length > 0) {
            router.replace(`/${workspaces[0].id}`);
            return;
          }
        }
      } catch {}
      setCheckingExisting(false);
    })();
  }, [isLoaded, user, router]);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!user || !firstName.trim()) return;
    setSavingProfile(true);
    setError(null);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        unsafeMetadata: {
          ...((user.unsafeMetadata as Record<string, unknown>) || {}),
          avatarColor,
        },
      });
      setStep(1);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    }
    setSavingProfile(false);
  }, [user, firstName, lastName]);

  // Validate invite code as user types
  const validateInvite = useCallback(async (code: string) => {
    if (code.length < 4) {
      setInviteInfo(null);
      return;
    }
    setValidatingCode(true);
    try {
      const res = await fetch(`/api/invites?code=${encodeURIComponent(code.trim())}`);
      if (res.ok) {
        setInviteInfo(await res.json());
        setError(null);
      } else {
        setInviteInfo(null);
      }
    } catch {
      setInviteInfo(null);
    }
    setValidatingCode(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => validateInvite(inviteCode), 400);
    return () => clearTimeout(timeout);
  }, [inviteCode, validateInvite]);

  // Create group flow
  const handleCreateGroup = useCallback(async () => {
    if (!user || !groupName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const orgRes = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });

      if (!orgRes.ok) {
        const body = await orgRes.json().catch(() => ({}));
        setError(body.error || "Failed to create group");
        setLoading(false);
        return;
      }

      const { orgId, workspaceId } = await orgRes.json();

      await user.update({
        unsafeMetadata: {
          ...((user.unsafeMetadata as Record<string, unknown>) || {}),
          onboardingComplete: true,
        },
      });

      if (setActive) {
        await setActive({ organization: orgId });
      }

      router.push(`/${workspaceId}`);
    } catch (err: any) {
      console.error("Create group error:", err);
      setError(err?.message || "Something went wrong");
      setLoading(false);
    }
  }, [user, groupName, router, setActive]);

  // Join group flow
  const handleJoinGroup = useCallback(async () => {
    if (!user || !inviteInfo) return;
    setLoading(true);
    setError(null);

    try {
      const redeemRes = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });

      if (!redeemRes.ok) {
        const body = await redeemRes.json().catch(() => ({}));
        setError(body.error || "Failed to join group");
        setLoading(false);
        return;
      }

      const { workspace, orgId } = await redeemRes.json();

      await user.update({
        unsafeMetadata: {
          ...((user.unsafeMetadata as Record<string, unknown>) || {}),
          onboardingComplete: true,
        },
      });

      if (setActive) {
        await setActive({ organization: orgId });
      }

      router.push(`/${workspace.id}`);
    } catch (err: any) {
      console.error("Join group error:", err);
      setError(err?.message || "Something went wrong");
      setLoading(false);
    }
  }, [user, inviteInfo, inviteCode, router, setActive]);

  // Progress calculation
  const totalSteps = needsProfile ? 3 : 2;
  const progressPercent = ((step + 1) / totalSteps) * 100;

  if (!isLoaded || checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="h-6 w-6 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="bg-grid fixed inset-0 pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400 animate-fade-in-up">
            {error}
          </div>
        )}

        {/* Step 0: Profile setup (only for email signups with no name) */}
        {step === 0 && needsProfile && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex items-center gap-2.5 mb-2">
              <ScribbleIcon size={22} className="text-black dark:text-white/90" />
              <span className="text-sm font-semibold text-black dark:text-white tracking-tight">
                MarkedUp
              </span>
            </div>

            {/* Avatar preview */}
            <div className="relative group">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white transition-colors overflow-hidden"
                style={{ backgroundColor: user?.imageUrl ? undefined : avatarColor }}
              >
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : firstName.trim() ? (
                  `${firstName.trim()[0]}${lastName.trim()?.[0] || ""}`.toUpperCase()
                ) : (
                  <User className="h-7 w-7" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
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
            </div>

            {/* Color picker */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {[
                "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444",
                "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  className={`h-6 w-6 rounded-full transition-all ${
                    avatarColor === color
                      ? "ring-2 ring-offset-2 ring-black/20 dark:ring-white/20 dark:ring-offset-black scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Set up your profile
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-3">
              This is how your team will see you
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <input
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="h-12 w-full rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && firstName.trim()) handleSaveProfile();
                }}
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name (optional)"
                className="h-12 w-full rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && firstName.trim()) handleSaveProfile();
                }}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || !firstName.trim()}
              className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 1: Choose path — Create or Join */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex items-center gap-2.5 mb-2">
              <ScribbleIcon size={22} className="text-black dark:text-white/90" />
              <span className="text-sm font-semibold text-black dark:text-white tracking-tight">
                MarkedUp
              </span>
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome"}
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-3">
              Create a new group or join an existing one
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  setPath("create");
                  setStep(2);
                }}
                className="group flex items-center gap-4 rounded-xl border border-black/8 dark:border-white/10 px-5 py-4 text-left transition-all hover:border-black/20 dark:hover:border-white/25 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <Building2 className="h-5 w-5 text-black/60 dark:text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    Create a group
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                    Start a new team and invite others
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-black/20 dark:text-white/20 ml-auto group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors" />
              </button>

              <button
                onClick={() => {
                  setPath("join");
                  setStep(2);
                }}
                className="group flex items-center gap-4 rounded-xl border border-black/8 dark:border-white/10 px-5 py-4 text-left transition-all hover:border-black/20 dark:hover:border-white/25 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <UserPlus className="h-5 w-5 text-black/60 dark:text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    Join a group
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                    Enter an invite code from your team
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-black/20 dark:text-white/20 ml-auto group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Create Group */}
        {step === 2 && path === "create" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
              <Building2 className="h-6 w-6 text-black/60 dark:text-white/60" />
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Name your group
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              This is your team&apos;s shared workspace
            </p>

            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Acme Inc."
              className="h-12 w-full max-w-xs rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter" && groupName.trim()) handleCreateGroup();
              }}
            />

            <p className="text-[11px] text-black/30 dark:text-white/30 -mt-2 max-w-xs text-center">
              You can invite your team after setup. A personal workspace will also be created for your private documents.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPath(null);
                  setStep(1);
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading || !groupName.trim()}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create group
                    <Sparkles className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Join Group */}
        {step === 2 && path === "join" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
              <UserPlus className="h-6 w-6 text-black/60 dark:text-white/60" />
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Enter your invite code
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              Ask your team admin for the code
            </p>

            <div className="w-full max-w-xs">
              <input
                autoFocus
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. abc123"
                className="h-12 w-full rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center font-mono tracking-wider"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inviteInfo) handleJoinGroup();
                }}
              />

              {/* Validation feedback */}
              <div className="mt-2 h-6 flex items-center justify-center">
                {validatingCode && (
                  <span className="text-[11px] text-black/30 dark:text-white/30 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </span>
                )}
                {!validatingCode && inviteInfo && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3 w-3" />
                    Join {inviteInfo.workspace.name}
                  </span>
                )}
                {!validatingCode && inviteCode.length >= 4 && !inviteInfo && (
                  <span className="text-[11px] text-red-500/70">
                    Invalid invite code
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPath(null);
                  setStep(1);
                  setInviteCode("");
                  setInviteInfo(null);
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={handleJoinGroup}
                disabled={loading || !inviteInfo}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join group
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
