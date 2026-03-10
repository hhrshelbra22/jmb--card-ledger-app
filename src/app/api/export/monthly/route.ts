import { requireAuthUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProUser, toCSV, csvResponse, exportError } from "@/lib/supabase/exports";

export async function GET() {
  try {
    const user = await requireAuthUser();

    if (!(await isProUser(user.id))) {
      throw new Error("PRO_REQUIRED");
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sales")
      .select(
        "sale_date, net_proceeds, cost_basis_used, platform_fee, processing_fee, shipping_cost, other_fees, realized_profit"
      )
      .eq("user_id", user.id)
      .order("sale_date", { ascending: true });

    if (error) throw new Error(error.message);

    // Group by YYYY-MM
    const monthMap = new Map<
      string,
      {
        revenue: number;
        cogs: number;
        fees: number;
        profit: number;
      }
    >();

    for (const row of data ?? []) {
      const month = (row.sale_date as string).slice(0, 7); // "2026-03"
      const existing = monthMap.get(month) ?? {
        revenue: 0,
        cogs: 0,
        fees: 0,
        profit: 0,
      };

      const fees =
        Number(row.platform_fee) +
        Number(row.processing_fee) +
        Number(row.shipping_cost) +
        Number(row.other_fees);

      monthMap.set(month, {
        revenue: existing.revenue + Number(row.net_proceeds),
        cogs: existing.cogs + Number(row.cost_basis_used),
        fees: existing.fees + fees,
        profit: existing.profit + Number(row.realized_profit),
      });
    }

    const rows = Array.from(monthMap.entries()).map(([month, v]) => ({
      month,
      revenue: v.revenue.toFixed(2),
      cogs: v.cogs.toFixed(2),
      fees: v.fees.toFixed(2),
      profit: v.profit.toFixed(2),
    }));

    const today = new Date().toISOString().split("T")[0];
    return csvResponse(toCSV(rows), `monthly_summary_${today}.csv`);
  } catch (e) {
    return exportError(e);
  }
}