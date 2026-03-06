"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRefreshLotPrice } from "@/lib/query/inventory";
import type { InventoryLot } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PriceCellProps {
  lot: InventoryLot;
  onOpenHistory: (lot: InventoryLot) => void;
}

function computeDelta(current: number, previous: number | null) {
  if (previous == null) return null;
  const amount = current - previous;
  const percent = previous === 0 ? null : (amount / previous) * 100;
  return { amount, percent };
}

export function PriceCell({ lot, onOpenHistory }: PriceCellProps) {
  const refresh = useRefreshLotPrice();

  // We need the previous estimate to compute delta
  // We derive it from the lot's last_estimate_price vs what was there before
  // For delta we fetch on demand via the history drawer — here we just show
  // current price + a refresh button. Delta is shown after >= 2 fetches.
  const current = lot.last_estimate_price;
  const lastUpdated = lot.last_estimate_at;

  function formatTimeAgo(isoString: string) {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (current == null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">—</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          disabled={refresh.isPending}
          onClick={(e) => {
            e.stopPropagation();
            refresh.mutate(lot.id);
          }}
          aria-label="Refresh price"
        >
          <RefreshCw
            className={cn(
              "w-3 h-3 text-muted-foreground",
              refresh.isPending && "animate-spin"
            )}
          />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-0.5 cursor-pointer"
      onClick={() => onOpenHistory(lot)}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-mono font-medium">
          {formatCurrency(current)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          disabled={refresh.isPending}
          onClick={(e) => {
            e.stopPropagation();
            refresh.mutate(lot.id);
          }}
          aria-label="Refresh price"
        >
          <RefreshCw
            className={cn(
              "w-3 h-3 text-muted-foreground",
              refresh.isPending && "animate-spin"
            )}
          />
        </Button>
      </div>
      {lastUpdated && (
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(lastUpdated)}
        </span>
      )}
    </div>
  );
}

// Separate delta indicator — needs previous price from history
interface DeltaIndicatorProps {
  current: number;
  previous: number | null;
}

export function DeltaIndicator({ current, previous }: DeltaIndicatorProps) {
  if (previous == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const delta = computeDelta(current, previous);
  if (!delta) return <span className="text-xs text-muted-foreground">—</span>;

  const { amount, percent } = delta;

  if (amount === 0) {
    return (
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <Minus className="w-3 h-3" />
        <span className="text-xs">$0.00</span>
      </div>
    );
  }

  const isUp = amount > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-emerald-500" : "text-red-500"
      )}
    >
      {isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>
        {isUp ? "+" : ""}
        {formatCurrency(amount)}
      </span>
      {percent != null && (
        <span className="text-xs opacity-80">
          ({isUp ? "+" : ""}
          {percent.toFixed(1)}%)
        </span>
      )}
    </div>
  );
}