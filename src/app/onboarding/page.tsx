"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ArrowRight, Sparkles } from "lucide-react";

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

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"
    : "U";

  const handleComplete = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Upload avatar if provided
      if (avatarFile) {
        await user.setProfileImage({ file: avatarFile });
      }

      // Save metadata
      await user.update({
        unsafeMetadata: {
          role,
          avatarColor,
          onboardingComplete: true,
        },
      });

      // Create workspace
      const wsName = workspaceName || `${user.firstName ?? "My"}'s Workspace`;
      const slug = wsName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName, slug }),
      });

      if (res.ok) {
        const ws = await res.json();
        router.push(`/${ws.id}`);
      } else {
        // Fallback: go to a default workspace
        router.push("/demo/doc-1");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      router.push("/demo/doc-1");
    } finally {
      setLoading(false);
    }
  }, [user, avatarFile, role, avatarColor, workspaceName, router]);

  // If onboarding already complete, redirect to their workspace
  useEffect(() => {
    if (!isLoaded || !user) return;
    if (user.unsafeMetadata?.onboardingComplete) {
      // Fetch their workspace and redirect
      (async () => {
        try {
          const res = await fetch("/api/workspaces");
          if (res.ok) {
            const workspaces = await res.json();
            if (workspaces.length > 0) {
              router.push(`/${workspaces[0].id}`);
              return;
            }
          }
        } catch {}
        // If no workspace found, let them re-onboard
      })();
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
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
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>

        {/* Step 0: Avatar & Name */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <div className="flex items-center gap-2 text-black/30 dark:text-white/30">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-widest font-medium">Welcome to MarkedUp</span>
            </div>

            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Let's set up your profile
            </h1>

            <AvatarUpload
              currentImageUrl={user?.imageUrl}
              fallbackInitials={initials}
              color={avatarColor}
              size="lg"
              onUpload={setAvatarFile}
              onRemove={() => setAvatarFile(null)}
            />

            {/* Color picker for fallback avatar */}
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
                      avatarColor === c ? "scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black ring-black/20 dark:ring-white/20" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm text-black/40 dark:text-white/40">
              {user?.firstName ? `Hi ${user.firstName}!` : "Upload a photo or pick a color"}
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
                  <span className="text-sm font-medium text-black dark:text-white">{r.label}</span>
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

        {/* Step 2: Workspace */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up w-full">
            <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight text-center">
              Name your workspace
            </h1>
            <p className="text-sm text-black/40 dark:text-white/40 -mt-2">
              Where your documents will live
            </p>

            <input
              autoFocus
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder={`${user?.firstName ?? "My"}'s Workspace`}
              className="h-12 w-full max-w-xs rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-4 text-base text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/25 dark:focus:border-white/25 transition-colors text-center"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleComplete();
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex h-10 items-center rounded-xl border border-black/8 dark:border-white/10 px-5 text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex h-10 items-center gap-2 rounded-xl bg-black dark:bg-white px-6 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black animate-spin" />
                ) : (
                  <>
                    Create workspace
                    <Sparkles className="h-3.5 w-3.5" />
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
