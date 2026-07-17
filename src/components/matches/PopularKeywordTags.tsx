"use client";

import { useEffect, useState } from "react";
import { extractTopKeywords } from "@/lib/analytics";
import { getMatches } from "@/lib/matches";

// Shows the user's own most-used keyword tags above KeywordTagInput so
// recurring themes are one tap away instead of retyped every time. Renders
// nothing until there's enough history to be worth surfacing.
export function PopularKeywordTags({
  value,
  onSelect,
}: {
  value: string[];
  onSelect: (tag: string) => void;
}) {
  const [topKeywords, setTopKeywords] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMatches()
      .then((matches) => {
        if (cancelled) return;
        const top = extractTopKeywords(matches, 5, ["keywords"]).map(
          (entry) => entry.word,
        );
        setTopKeywords(top);
      })
      .catch((error: unknown) => {
        console.error("Failed to load popular keywords:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (topKeywords.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        よく使うタグ
      </p>
      <div className="flex flex-wrap gap-2">
        {topKeywords.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onSelect(tag)}
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-cyan-500 bg-cyan-500 text-black"
                  : "border-cyan-500/30 bg-cyan-500/5 text-cyan-300 active:bg-cyan-500/15"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
