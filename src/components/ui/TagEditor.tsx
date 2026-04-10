"use client";

import React, { useCallback, useRef, useState } from "react";
import { X, Tag } from "lucide-react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagEditor({ tags, onChange, placeholder = "Add tag..." }: TagEditorProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        onChange([...tags, tag]);
      }
      setInput("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(input);
      }
      if (e.key === "Backspace" && !input && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [input, tags, addTag, removeTag]
  );

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-[32px] rounded-lg border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5 cursor-text transition-colors focus-within:border-black/15 dark:focus-within:border-white/15"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-black/[0.06] dark:bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-black/60 dark:text-white/60"
        >
          <Tag className="h-2.5 w-2.5" />
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-0.5 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[60px] bg-transparent text-[11px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none"
      />
    </div>
  );
}
