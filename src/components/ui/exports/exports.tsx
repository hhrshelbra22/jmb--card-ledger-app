"use client";

import { useState } from "react";
import { Download, Lock } from "lucide-react";
import { useProfile } from "@/lib/query/profile";

type ExportType = "purchases" | "sales" | "fifo" | "monthly";

const EXPORTS: { type: ExportType; label: string; description: string }[] = [
  {
    type: "purchases",
    label: "Purchases",
    description: "All inventory lots with cost basis",
  },
  {
    type: "sales",
    label: "Sales",
    description: "All sales with profit fields",
  },
  {
    type: "fifo",
    label: "FIFO Allocations",
    description: "Cost allocation per sale",
  },
  {
    type: "monthly",
    label: "Monthly Summary",
    description: "Revenue / COGS / Fees / Profit by month",
  },
];

export function ExportButtons() {
  const { data: profile, isLoading } = useProfile();
  const [downloading, setDownloading] = useState<ExportType | null>(null);

  const isPro =
    profile?.role === "pro" ||
    profile?.role === "dealer" ||
    profile?.role === "admin";

  async function handleExport(type: ExportType) {
    if (!isPro) return;
    setDownloading(type);
    try {
      const res = await fetch(`/api/export/${type}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Export failed");
        return;
      }
      // Trigger file download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers
        .get("Content-Disposition")
        ?.split('filename="')[1]
        ?.replace('"', "") ?? `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map((e) => (
          <div
            key={e.type}
            className="h-16 rounded-lg border border-border bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isPro && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <Lock className="size-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            CSV exports are a{" "}
            <span className="font-semibold">Pro feature</span>. Upgrade to
            download your data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map((e) => (
          <button
            key={e.type}
            onClick={() => handleExport(e.type)}
            disabled={!isPro || downloading === e.type}
            className={`
              flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors
              ${
                isPro
                  ? "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "border-border bg-muted/50 cursor-not-allowed opacity-60"
              }
            `}
          >
            {isPro ? (
              <Download
                className={`size-4 shrink-0 ${
                  downloading === e.type
                    ? "animate-bounce text-primary"
                    : "text-muted-foreground"
                }`}
              />
            ) : (
              <Lock className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{e.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {e.description}
              </p>
            </div>
            {downloading === e.type && (
              <span className="ml-auto text-xs text-primary shrink-0">
                Downloading...
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}