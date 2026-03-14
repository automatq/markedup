"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import { AvatarUpload } from "@/components/AvatarUpload";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  UserPlus,
  Loader2,
  Check,
  Copy,
} from "lucide-react";

const ROLES = [
  { key: "engineer", label: "Engineer", icon: "🛠️" },
  { key: "designer", label: "Designer", icon: "🎨" },
  { key: "pm", label: "Product Manager", icon: "📋" },
  { key: "founder", label: "Founder", icon: "🚀" },
  { key: "writer", label: "Writer", icon: "✍️" },
  { key: "other", label: "Other", icon: "💼" },
];

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
  "#f97316", "#84cc16", "#06b6d4", "#a855f7",
];

type OnboardingPath = null | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { setActive } = useOrganizationList();

  // Steps: 0=profile, 1=role, 2=choose path, 3=create company OR join company
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Create path state
  const [path, setPath] = useState<OnboardingPath>(null);
  const [companyName, setCompanyName] = useState("");

  // Join path state
  const [inviteCode, setInviteCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    code: string;
    workspace: { id: string; name: string };
  } | null>(null);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
      "U"
    : "U";

  const totalSteps = 4;

  // Check if user already has workspaces — if so, skip onboarding
  useEffect(() => {
    if (!isLoaded || !user) return;

    (async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const workspaces = await res.json();
          if (workspaces.length > 0) {
            router.replace(`/${workspaces[0].id}`);
            return;
          }
        }
      } catch {}
      setCheckingExisting(false);
    })();
  }, [isLoaded, user, router]);

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

  // Create company flow
  const handleCreateCompany = useCallback(async () => {
    if (!user || !companyName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Upload avatar if provided
      if (avatarFile) {
        await user.setProfileImage({ file: avatarFile });
      }

      // 1. Create a Clerk Organization for the company
      const orgRes = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim() }),
      });

      if (!orgRes.ok) {
        const body = await orgRes.json().catch(() => ({}));
        setError(body.error || "Failed to create organization");
        setLoading(false);
        return;
      }

      const { orgId, workspaceId } = await orgRes.json();

      // 2. Save user metadata
      await user.update({
        unsafeMetadata: {
          role,
          avatarColor,
          onboardingComplete: true,
        },
      });

      // 3. Set the active organization in Clerk (client-side)
      if (setActive) {
        await setActive({ organization: orgId });
      }

      router.push(`/${workspaceId}`);
    } catch (err: any) {
      console.error("Create company error:", err);
      setError(err?.message || "Something went wrong");
      setLoading(false);
    }
  }, [user, companyName, avatarFile, role, avatarColor, router]);

  // Join company flow
  const handleJoinCompany = useCallback(async () => {
    if (!user || !inviteInfo) return;
    setLoading(true);
    setError(null);

    try {
      // Upload avatar if provided
      if (avatarFile) {
        await user.setProfileImage({ file: avatarFile });
      }

      // 1. Redeem the invite code (joins Clerk org + creates personal workspace)
      const redeemRes = await fetch("/api/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });

      if (!redeemRes.ok) {
        const body = await redeemRes.json().catch(() => ({}));
        setError(body.error || "Failed to join company");
        setLoading(false);
        return;
      }

      const { workspace, orgId } = await redeemRes.json();

      // 2. Save user metadata
      await user.update({
        unsafeMetadata: {
          role,
          avatarColor,
          onboardingComplete: true,
        },
      });

      // 3. Set the active organization (client-side)
      if (setActive) {
        await setActive({ organization: orgId });
      }

      router.push(`/${workspace.id}`);
    } catch (err: any) {
      console.error("Join company error:", err);
      setError(err?.message || "Something went wrong");
      setLoading(false);
    }
  }, [user, inviteInfo, inviteCode, avatarFile, role, avatarColor, router]);

  if (!isLoaded || checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="h-6 w-6 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
      </div>
    );
  }

  const currentStep = path === null ? step : step;
  const progressWidth = `${((currentStep + 1) / totalSteps) * 100}%`;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="bg-grid fixed inset-0 pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-500"
            style={{ width: progressWidth }}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400 animate-fade-in-up">
            {error}
          </div>
        )}

        {/* Step 0: Avatar & Profile */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex items-center gap-2 text-black/30 dark:text-white/30">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-widest font-medium">
                Welcome to MarkedUp
              </span>
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Let&apos;s set up your profile
            </h1>

            <AvatarUpload
              currentImageUrl={user?.imageUrl}
              fallbackInitials={initials}
              color={avatarColor}
              size="lg"
              onUpload={setAvatarFile}
              onRemove={() => setAvatarFile(null)}
            />

            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30">
                Avatar color
              </p>
              <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`h-6 w-6 rounded-full transition-all ${
                      avatarColor === c
                        ? "scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black ring-black/20 dark:ring-white/20"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm text-black/40 dark:text-white/40">
              {user?.firstName
                ? `Hi ${user.firstName}!`
                : "Upload a photo or pick a color"}
            </p>

            <button
              onClick={() => setStep(1)}
              className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Step 1: Role */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              What do you do?
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              This helps us tailor your experience
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-all ${
                    role === r.key
                      ? "border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.04]"
                      : "border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25"
                  }`}
                >
                  <span className="text-lg">{r.icon}</span>
                  <span className="text-sm font-medium text-black dark:text-white">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex h-10 items-center rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!role}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose path — Create or Join */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              How do you want to get started?
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              Create your own company or join an existing one
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  setPath("create");
                  setStep(3);
                }}
                className="group flex items-center gap-4 rounded-xl border border-black/8 dark:border-white/10 px-5 py-4 text-left transition-all hover:border-black/20 dark:hover:border-white/25 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <Building2 className="h-5 w-5 text-black/60 dark:text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    Create a company
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                    Set up a new workspace and invite your team
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-black/20 dark:text-white/20 ml-auto group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors" />
              </button>

              <button
                onClick={() => {
                  setPath("join");
                  setStep(3);
                }}
                className="group flex items-center gap-4 rounded-xl border border-black/8 dark:border-white/10 px-5 py-4 text-left transition-all hover:border-black/20 dark:hover:border-white/25 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <UserPlus className="h-5 w-5 text-black/60 dark:text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    Join a company
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">
                    Enter an invite code from your team
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-black/20 dark:text-white/20 ml-auto group-hover:text-black/50 dark:group-hover:text-white/50 transition-colors" />
              </button>
            </div>

            <button
              onClick={() => setStep(1)}
              className="flex h-10 items-center rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Create Company */}
        {step === 3 && path === "create" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
              <Building2 className="h-6 w-6 text-black/60 dark:text-white/60" />
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Name your company
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              This will be your team&apos;s shared workspace
            </p>

            <input
              autoFocus
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
              className="h-12 w-full max-w-xs rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter" && companyName.trim()) handleCreateCompany();
              }}
            />

            <p className="text-[11px] text-black/30 dark:text-white/30 -mt-2 max-w-xs text-center">
              You&apos;ll be able to invite your team after setup. A personal workspace will also be created for your private documents.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPath(null);
                  setStep(2);
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={loading || !companyName.trim()}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create company
                    <Sparkles className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Join Company */}
        {step === 3 && path === "join" && (
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
                  if (e.key === "Enter" && inviteInfo) handleJoinCompany();
                }}
              />

              {/* Validation feedback */}
              <div className="mt-2 h-6 flex items-center justify-center">
                {validatingCode && (
                  <span className="text-[11px] text-black/30 dark:text-white/30 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking…
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
                  setStep(2);
                  setInviteCode("");
                  setInviteInfo(null);
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                onClick={handleJoinCompany}
                disabled={loading || !inviteInfo}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join company
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
