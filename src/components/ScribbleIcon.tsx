"use client";

import React from "react";

interface ScribbleIconProps {
  size?: number;
  className?: string;
}

/**
 * A hand-drawn scribble/pen-stroke icon — the MarkedUp logo mark.
 * Designed to feel organic, like ink on paper.
 */
export function ScribbleIcon({ size = 20, className = "" }: ScribbleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Main scribble stroke — a loose, hand-drawn loop */}
      <path
        d="M6 24C8 20 12 10 16 8C20 6 22 14 18 18C14 22 10 16 14 12C18 8 24 6 26 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Small ink dot — like a pen touch */}
      <circle cx="26.5" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}
