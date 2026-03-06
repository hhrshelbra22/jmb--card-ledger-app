import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await ctx.params;
    const supabase = await createSupabaseServerClient();

    // 1. Verify lot belongs to user
    const { data: lot, error: lotError } = await supabase
      .from("inventory_lots")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    // 2. Parse ?days= param (default 30)
    const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 3. Fetch price history for this lot only
    const { data: estimates, error } = await supabase
      .from("price_estimates")
      .select("id, estimated_price, fetched_at, status, source_url")
      .eq("inventory_lot_id", id)
      .eq("user_id", user.id)
      .eq("status", "ok")
      .gte("fetched_at", since.toISOString())
      .order("fetched_at", { ascending: true });

    if (error) throw new Error(error.message);

    // 4. Compute stats
    const prices = (estimates ?? [])
      .map((e) => e.estimated_price)
      .filter((p): p is number => p != null);

    const stats =
      prices.length > 0
        ? {
            high: Math.max(...prices),
            low: Math.min(...prices),
            avg: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
          }
        : null;

    return NextResponse.json({
      estimates: estimates ?? [],
      stats,
    });
  } catch (e) {
    return handleError(e);
  }
}