"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

interface CardSuggestion {
  id: string;
  "product-name": string;
  "console-name": string;
}

interface CardSearchInputProps {
  onSelect: (cardName: string, setName: string) => void;
  game: string;
}

export function CardSearchInput({ onSelect, game }: CardSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/inventory/search-cards?q=${encodeURIComponent(query + " " + game)}`
        );
        const data = await res.json();
        setSuggestions(data.products ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query, game]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search card name..."
          className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-y-auto">
          {loading ? (
            <div className="p-2 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No cards found
            </div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex flex-col gap-0.5"
                onClick={() => {
                  onSelect(s["product-name"], s["console-name"]);
                  setQuery(s["product-name"]);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-foreground">
                  {s["product-name"]}
                </span>
                <span className="text-muted-foreground">
                  {s["console-name"]}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}