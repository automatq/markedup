"use client";

import React, { useEffect, useState } from "react";
import { Editor } from "@tiptap/core";

interface EditorStatusBarProps {
  editor: Editor | null;
}

export function EditorStatusBar({ editor }: EditorStatusBarProps) {
  const [stats, setStats] = useState({ words: 0, characters: 0, readingTime: 0 });

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const text = editor.state.doc.textContent;
      const trimmed = text.trim();
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      const characters = text.length;
      const readingTime = Math.max(1, Math.ceil(words / 200));
      setStats({ words, characters, readingTime });
    };

    update();
    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="sticky bottom-0 flex items-center gap-4 px-4 py-1.5 text-[10px] text-black/30 dark:text-white/30 border-t border-black/6 dark:border-white/6 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-10">
      <span>{stats.words.toLocaleString()} words</span>
      <span>{stats.characters.toLocaleString()} characters</span>
      <span>{stats.readingTime} min read</span>
    </div>
  );
}
