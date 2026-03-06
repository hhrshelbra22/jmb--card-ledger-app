"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLotPriceHistory } from "@/lib/query/inventory";
import { DeltaIndicator } from "@/components/inventory/PriceCell";
import { formatCurrency, getGameColor } from "@/lib/utils";
import type { InventoryLot } from "@/types";
import { cn } from "@/lib/utils";

interface PriceHistoryDrawerProps {
  lot: InventoryLot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_OPTIONS = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
] as const;

function formatChartDate(isoString: string, days: number) {
  const date = new Date(isoString);
  if (days <= 7) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Reads a CSS variable and returns a usable color string for recharts SVG
function getCssVar(variable: string): string {
  if (typeof window === "undefined") return "";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value;
}

function hsl(variable: string): string {
  const value = getCssVar(variable);
  if (!value) return "#888"; // fallback so chart is never invisible
  if (value.startsWith("hsl") || value.startsWith("rgb") || value.startsWith("#")) {
    return value;
  }
  return `hsl(${value})`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value == null) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground mb-0.5">{String(label)}</p>
      <p className="text-sm font-mono font-semibold text-popover-foreground">
        {formatCurrency(Number(value))}
      </p>
    </div>
  );
}

// Hook to detect dark mode changes so chart re-renders with correct colors
function useChartColors() {
  const [colors, setColors] = useState({
    primary: "#06b6d4",       // fallback cyan
    border: "#333333",        // fallback dark border
    mutedForeground: "#888888",
    background: "#000000",
  });

  useEffect(() => {
    function update() {
      // Force re-read after a tick so dark mode class is applied first
      requestAnimationFrame(() => {
        const primary = hsl("--primary");
        const border = hsl("--border");
        const mutedForeground = hsl("--muted-foreground");
        const background = hsl("--background");

        setColors({
          primary: primary || "#06b6d4",
          border: border || "#333333",
          mutedForeground: mutedForeground || "#888888",
          background: background || "#000000",
        });
      });
    }

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
export function PriceHistoryDrawer({
  lot,
  open,
  onOpenChange,
}: PriceHistoryDrawerProps) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { data, isLoading } = useLotPriceHistory(lot?.id ?? null, days);
  const colors = useChartColors();

  const estimates = data?.estimates ?? [];
  const stats = data?.stats ?? null;

  const chartData = estimates.map((e) => ({
    date: formatChartDate(e.fetched_at, days),
    price: e.estimated_price,
    fullDate: e.fetched_at,
  }));

  const sorted = [...estimates].sort(
    (a, b) =>
      new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime()
  );
  const current = sorted[0]?.estimated_price ?? null;
  const previous = sorted[1]?.estimated_price ?? null;

  const unrealizedValue = current != null ? current * lot?.qty_on_hand! : null;
  const costBasisTotal = lot ? lot.cost_per_card * lot.qty_on_hand : null;
  const gainLoss =
    unrealizedValue != null && costBasisTotal != null
      ? unrealizedValue - costBasisTotal
      : null;

  if (!lot) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[520px] ml-auto flex flex-col h-full">

        {/* Header */}
        <DrawerHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3">
            <div
              className="w-1 h-12 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: getGameColor(lot.game) }}
            />
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-base sm:text-lg truncate">
                {lot.card_name}
              </DrawerTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {lot.set_name}
                </span>
                <Badge variant="outline" className="text-xs h-4 shrink-0">
                  {lot.condition}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  Qty: {lot.qty_on_hand}
                </span>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-5">

          {/* Current price + your cost */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">
                Current Market Price
              </p>
              <p className="text-xl sm:text-2xl font-bold font-mono">
                {current != null ? formatCurrency(current) : "—"}
              </p>
              <div className="mt-1">
                <DeltaIndicator current={current ?? 0} previous={previous} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground mb-0.5">Your Cost</p>
              <p className="text-base sm:text-lg font-mono">
                {formatCurrency(lot.cost_per_card)}
              </p>
              {current != null && (
                <p
                  className={cn(
                    "text-xs font-medium mt-0.5",
                    current > lot.cost_per_card
                      ? "text-emerald-500"
                      : current < lot.cost_per_card
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {current > lot.cost_per_card ? "+" : ""}
                  {formatCurrency(current - lot.cost_per_card)} vs cost
                </p>
              )}
            </div>
          </div>

          {/* Day toggle */}
          <div className="flex gap-1.5">
            {DAY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={days === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          <div className="w-full h-44 sm:h-52">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-lg" />
            ) : chartData.length < 2 ? (
              <div className="w-full h-full flex items-center justify-center rounded-lg border border-border bg-muted/30">
                <div className="text-center px-4">
                  <p className="text-sm text-muted-foreground">
                    Not enough data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Refresh price at least twice to see a chart
                  </p>
                </div>
              </div>
            ) : (
              // Only render chart when colors are loaded to avoid flash
              colors.primary ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={colors.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: colors.mutedForeground,
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: colors.mutedForeground,
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                      width={42}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={colors.primary}
                      strokeWidth={2}
                      dot={{
                        fill: colors.primary,
                        stroke: colors.background,
                        strokeWidth: 2,
                        r: 3,
                      }}
                      activeDot={{
                        fill: colors.primary,
                        stroke: colors.background,
                        strokeWidth: 2,
                        r: 5,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="w-full h-full rounded-lg" />
              )
            )}
          </div>

          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "High", value: stats.high },
                { label: "Low", value: stats.low },
                { label: "Avg", value: stats.avg },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xs sm:text-sm font-mono font-medium mt-0.5">
                    {formatCurrency(s.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Unrealized P&L */}
          {gainLoss != null && lot.qty_on_hand > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
              <p className="text-xs text-muted-foreground mb-2">
                Unrealized P&L ({lot.qty_on_hand} cards remaining)
              </p>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Market Value</p>
                  <p className="text-sm font-mono font-medium">
                    {formatCurrency(unrealizedValue!)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost Basis</p>
                  <p className="text-sm font-mono font-medium">
                    {formatCurrency(costBasisTotal!)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Gain / Loss</p>
                  <p
                    className={cn(
                      "text-sm font-mono font-semibold",
                      gainLoss > 0
                        ? "text-emerald-500"
                        : gainLoss < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {gainLoss > 0 ? "+" : ""}
                    {formatCurrency(gainLoss)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data points count */}
          {!isLoading && (
            <p className="text-xs text-muted-foreground text-center pb-2">
              {estimates.length} data point
              {estimates.length !== 1 ? "s" : ""} in the last {days} days
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}