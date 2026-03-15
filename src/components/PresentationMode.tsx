"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

interface PresentationModeProps {
  html: string;
  title: string;
  onClose: () => void;
}

/**
 * Split editor HTML into slides.
 * Splits on <h1>, <h2>, or <hr> tags. Each heading starts a new slide.
 * Content before the first heading becomes the title slide.
 */
function splitIntoSlides(html: string, title: string): string[] {
  // Split on h1, h2, or hr — keep the delimiter
  const parts = html.split(/(?=<h[12][^>]*>)|(?=<hr[^>]*\/?>)/i);

  const slides: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Skip parts that are only whitespace or empty paragraphs
    const textContent = trimmed.replace(/<[^>]*>/g, "").trim();
    if (!textContent && !trimmed.match(/<img|<iframe|<video|<table/i)) continue;

    slides.push(trimmed);
  }

  // If no slides were created, make one from the whole content
  if (slides.length === 0 && html.trim()) {
    slides.push(html);
  }

  // If the first slide doesn't start with a heading, prepend the title
  if (slides.length > 0 && !slides[0].match(/^<h[12]/i)) {
    slides[0] = `<h1>${title}</h1>${slides[0]}`;
  }

  return slides;
}

export function PresentationMode({ html, title, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = useMemo(() => splitIntoSlides(html, title), [html, title]);
  const totalSlides = slides.length;

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen?.();
          }
          onClose();
          break;
        case "Home":
          e.preventDefault();
          setCurrentSlide(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentSlide(totalSlides - 1);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose, totalSlides]);

  // Enter fullscreen on mount
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const progress = totalSlides > 1 ? ((currentSlide + 1) / totalSlides) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col select-none">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-10">
        <div
          className="h-full bg-white/20 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="text-white/30 text-xs font-medium tracking-wide">
          {title}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {/* Click zones for navigation */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 w-1/5 z-[5] cursor-w-resize opacity-0"
          aria-label="Previous slide"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 w-1/5 z-[5] cursor-e-resize opacity-0"
          aria-label="Next slide"
        />

        <div
          className="w-full max-w-4xl mx-auto px-16 py-12 presentation-slide"
          dangerouslySetInnerHTML={{ __html: slides[currentSlide] || "" }}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-white/30 text-xs tabular-nums font-medium">
            {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={goNext}
            disabled={currentSlide === totalSlides - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Slide dots */}
        {totalSlides <= 20 && (
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-4 bg-white/40"
                    : "w-1.5 bg-white/10 hover:bg-white/20"
                }`}
              />
            ))}
          </div>
        )}

        <div className="text-white/20 text-[10px]">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[9px]">Esc</kbd>
          <span className="ml-1.5">exit</span>
          <span className="mx-2 text-white/10">|</span>
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[9px]">&larr; &rarr;</kbd>
          <span className="ml-1.5">navigate</span>
        </div>
      </div>
    </div>
  );
}
