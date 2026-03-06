"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useLotPriceHistory } from "@/lib/query/inventory";
import { formatCurrency } from "@/lib/utils";

interface PriceSparklineProps {
  lotId: string;
}

function getCssVar(variable: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

function hsl(variable: string): string {
  const value = getCssVar(variable);
  if (!value) return "#888";
  if (value.startsWith("hsl") || value.startsWith("rgb") || value.startsWith("#")) return value;
  return `hsl(${value})`;
}

function CustomSparkTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <div className="rounded border border-border bg-popover px-2 py-1 shadow-sm">
      <p className="text-xs font-mono text-popover-foreground">
        {formatCurrency(Number(value))}
      </p>
    </div>
  );
}

export function PriceSparkline({ lotId }: PriceSparklineProps) {
  const { data } = useLotPriceHistory(lotId, 30);
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");

  useEffect(() => {
    function update() {
      requestAnimationFrame(() => {
        setPrimaryColor(hsl("--primary") || "#06b6d4");
      });
    }
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const estimates = data?.estimates ?? [];

  // Need at least 2 points to draw a line
  if (estimates.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const chartData = estimates.map((e) => ({
    price: e.estimated_price,
  }));

  // Determine line color based on trend
  const first = estimates[0]?.estimated_price ?? 0;
  const last = estimates[estimates.length - 1]?.estimated_price ?? 0;
  const trendColor =
    last > first
      ? "#10b981"  // emerald-500 — up
      : last < first
      ? "#ef4444"  // red-500 — down
      : primaryColor; // flat — use primary

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Tooltip content={<CustomSparkTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke={trendColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}