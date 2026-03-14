"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScribbleIcon } from "@/components/ScribbleIcon";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      {/* Subtle grid background */}
      <div className="bg-grid fixed inset-0 pointer-events-none" />

      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 gap-6 text-center">
        {/* Logo mark */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03]">
            <ScribbleIcon size={28} className="text-black dark:text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
            MarkedUp
          </h1>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <p className="text-sm text-black/50 dark:text-white/50 max-w-xs">
            A collaborative, block-based Markdown editor.
            Local-first speed meets real-time sync.
          </p>
        </div>

        {/* CTA buttons — Linktree style */}
        <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <button
            onClick={() => router.push("/sign-up")}
            className="flex h-9 items-center rounded-lg bg-black px-5 text-sm font-medium text-white hover:opacity-80 transition-opacity dark:bg-white dark:text-black"
          >
            Get started
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            className="flex h-9 items-center rounded-lg border border-black/10 dark:border-white/10 px-5 text-sm font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Sign in
          </button>
        </div>

        {/* Feature pills */}
        <div
          className="mt-6 flex flex-wrap justify-center gap-2.5 animate-fade-in-up"
          style={{ animationDelay: "180ms" }}
        >
          {[
            { label: "/ Slash Commands", delay: "240ms" },
            { label: "[[ Backlinks", delay: "300ms" },
            { label: "# Markdown Native", delay: "360ms" },
          ].map((item) => (
            <span
              key={item.label}
              className="animate-fade-in-up inline-flex items-center rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 text-xs text-black/50 dark:text-white/50"
              style={{ animationDelay: item.delay }}
            >
              {item.label}
            </span>
          ))}
        </div>

        {/* Bottom feature cards — Linktree "minimal" card style */}
        <div
          className="mt-4 w-full max-w-sm flex flex-col gap-2.5 animate-fade-in-up"
          style={{ animationDelay: "420ms" }}
        >
          {[
            {
              title: "Real-time collaboration",
              desc: "CRDT-powered sync via Yjs",
            },
            {
              title: "Block-based editing",
              desc: "TipTap engine with custom extensions",
            },
            {
              title: "Clean Markdown export",
              desc: "Standard-compliant .md output",
            },
          ].map((card, i) => (
            <div
              key={card.title}
              className="group flex items-center justify-between rounded-xl border border-black/8 bg-black/[0.03] px-5 py-4 transition-all duration-150 hover:border-black/20 hover:bg-black/[0.06] active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25 dark:hover:bg-white/[0.07] animate-fade-in-up"
              style={{ animationDelay: `${480 + i * 60}ms` }}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-black dark:text-white">
                  {card.title}
                </p>
                <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                  {card.desc}
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black/20 dark:text-white/20 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-black/50 dark:group-hover:text-white/60 shrink-0 ml-4"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
