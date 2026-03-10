import { NextResponse } from "next/server";
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
      .from("inventory_lots")
      .select(
        "purchase_date, card_name, game, set_name, variant, condition, qty_initial, qty_on_hand, cost_per_card, total_cost, vendor, created_at"
      )
      .eq("user_id", user.id)
      .order("purchase_date", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((r) => ({
      purchase_date: r.purchase_date,
      card_name: r.card_name,
      game: r.game,
      set_name: r.set_name,
      variant: r.variant,
      condition: r.condition,
      qty_purchased: r.qty_initial,
      qty_remaining: r.qty_on_hand,
      cost_per_card: Number(r.cost_per_card).toFixed(2),
      total_cost: Number(r.total_cost).toFixed(2),
      vendor: r.vendor ?? "",
      created_at: r.created_at,
    }));

    const today = new Date().toISOString().split("T")[0];
    return csvResponse(toCSV(rows), `purchases_${today}.csv`);
  } catch (e) {
    return exportError(e);
  }
}