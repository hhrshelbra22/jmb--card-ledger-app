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

    // Join fifo_consumption → sales + inventory_lots for full context
    const { data, error } = await supabase
      .from("fifo_consumption")
      .select(`
        id,
        qty_taken,
        cost_per_card,
        cost_total,
        created_at,
        sales!inner (
          user_id,
          sale_date,
          card_name,
          game,
          set_name,
          variant,
          condition,
          platform
        ),
        inventory_lots!inner (
          purchase_date,
          vendor
        )
      `)
      .eq("sales.user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((r) => {
    const sale = r.sales as unknown as Record<string, unknown>;
    const lot = r.inventory_lots as unknown as Record<string, unknown>;
      return {
        sale_date: sale.sale_date,
        card_name: sale.card_name,
        game: sale.game,
        set_name: sale.set_name,
        variant: sale.variant,
        condition: sale.condition,
        platform: sale.platform,
        purchase_date: lot.purchase_date,
        vendor: lot.vendor ?? "",
        qty_taken: r.qty_taken,
        cost_per_card: Number(r.cost_per_card).toFixed(2),
        cost_total: Number(r.cost_total).toFixed(2),
        allocated_at: r.created_at,
      };
    });

    const today = new Date().toISOString().split("T")[0];
    return csvResponse(toCSV(rows), `fifo_allocations_${today}.csv`);
  } catch (e) {
    return exportError(e);
  }
}