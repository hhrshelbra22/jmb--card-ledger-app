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
        "sale_date, card_name, game, set_name, variant, condition, platform, qty_sold, sale_price_each, platform_fee, processing_fee, shipping_cost, other_fees, net_proceeds, cost_basis_used, realized_profit, created_at"
      )
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((r) => ({
      sale_date: r.sale_date,
      card_name: r.card_name,
      game: r.game,
      set_name: r.set_name,
      variant: r.variant,
      condition: r.condition,
      platform: r.platform,
      qty_sold: r.qty_sold,
      sale_price_each: Number(r.sale_price_each).toFixed(2),
      platform_fee: Number(r.platform_fee).toFixed(2),
      processing_fee: Number(r.processing_fee).toFixed(2),
      shipping_cost: Number(r.shipping_cost).toFixed(2),
      other_fees: Number(r.other_fees).toFixed(2),
      net_proceeds: Number(r.net_proceeds).toFixed(2),
      cost_basis_used: Number(r.cost_basis_used).toFixed(2),
      realized_profit: Number(r.realized_profit).toFixed(2),
      created_at: r.created_at,
    }));

    const today = new Date().toISOString().split("T")[0];
    return csvResponse(toCSV(rows), `sales_${today}.csv`);
  } catch (e) {
    return exportError(e);
  }
}