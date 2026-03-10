"use client";

import { useState, useEffect } from "react";
import { useDashboardStats } from "@/lib/query/dashboard";
import { useSales } from "@/lib/query/sales";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { RecentSalesTable } from "@/components/dashboard/RecentSalesTable";
import { ExportButtons } from "@/components/ui/exports/exports";
import {
  TrendingUp,
  Package,
  DollarSign,
  Receipt,
  Layers,
  AlertTriangle,
  FileDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { formatCurrency, getGameColor, getGameDisplayName } from "@/lib/utils";
import type { Sale } from "@/types";

export default function DashboardPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { data: stats, isLoading: statsLoading } = useDashboardStats(period);
  const { data: salesData } = useSales({ page: 1, pageSize: 10 });
  const recentSales = salesData?.data ?? [];
  const topCards = [...recentSales]
    .sort((a, b) => b.realized_profit - a.realized_profit)
    .slice(0, 5);

  // Disclaimer: show on mount, auto-dismiss after 5s, user can close early
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowDisclaimer(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Here&apos;s your card business at a glance.
        </p>
      </motion.div>

      {/* ── Market Value Disclaimer (auto-dismiss 5s + close button) ─────── */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 leading-relaxed flex-1">
                <span className="font-semibold">Disclaimer:</span> Estimated
                inventory value is based on your{" "}
                <span className="font-medium">purchase cost basis</span>, not
                current market prices. Actual market value may be higher or
                lower. Do not rely on this figure for financial or tax
                decisions.
              </p>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="shrink-0 mt-0.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 transition-colors"
                aria-label="Dismiss disclaimer"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <KPICard
            title="Total Realized Profit"
            value={stats?.total_profit ?? 0}
            icon={TrendingUp}
            trend={(stats?.total_profit ?? 0) >= 0 ? "up" : "down"}
            isLoading={statsLoading}
            className="border-border rounded-xl relative overflow-hidden glow-primary"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <KPICard
            title="Total Revenue"
            value={stats?.total_revenue ?? 0}
            icon={DollarSign}
            isLoading={statsLoading}
            className="border-border rounded-xl glow-secondary"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <KPICard
            title="Cards on Hand"
            value={stats?.cards_on_hand ?? 0}
            icon={Package}
            format="number"
            isLoading={statsLoading}
            className="border-border rounded-xl glow-accent"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <KPICard
            title="Active Lots"
            value={stats?.active_lots ?? 0}
            icon={Receipt}
            format="number"
            isLoading={statsLoading}
            className="border-border rounded-xl"
          />
        </motion.div>

        {/* Est. Inventory Value — spans full width on mobile, normal on xl */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="col-span-2 lg:col-span-4 xl:col-span-1"
        >
          <KPICard
            title="Est. Inventory Value"
            value={stats?.inventory_estimated_value ?? 0}
            subtitle="Cost basis · not market price"
            icon={Layers}
            isLoading={statsLoading}
            className="border-border rounded-xl border-yellow-500/20"
          />
        </motion.div>
      </div>

      {/* ── Charts + Tables ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        <ProfitChart
          data={stats?.profit_by_period ?? []}
          isLoading={statsLoading}
          period={period}
          onPeriodChange={setPeriod}
        />

        <motion.div
          className="space-y-4 sm:space-y-5 md:space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <RecentSalesTable sales={recentSales} isLoading={statsLoading} />

          <Card className="p-4 sm:p-5 md:p-6 border-border rounded-xl">
            <h3 className="mb-3 sm:mb-4 font-medium text-sm sm:text-base">
              Top Performing Cards
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {topCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales yet</p>
              ) : (
                topCards.map((sale: Sale, index: number) => (
                  <motion.div
                    key={sale.id}
                    className="flex items-center gap-2 sm:gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  >
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        backgroundColor: `${getGameColor(sale.game)}20`,
                        color: getGameColor(sale.game),
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm truncate">
                        {sale.card_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getGameDisplayName(sale.game)}
                      </p>
                    </div>
                    <p
                      className={`text-xs sm:text-sm shrink-0 ${
                        sale.realized_profit >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {sale.realized_profit >= 0 ? "+" : ""}
                      {formatCurrency(sale.realized_profit)}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ── Export Section ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="p-4 sm:p-5 md:p-6 border-border rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="size-4 text-primary" />
            <h3 className="font-medium text-sm sm:text-base">Export Data</h3>
            <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Pro
            </span>
          </div>
          <ExportButtons />
        </Card>
      </motion.div>

    </div>
  );
}