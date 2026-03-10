import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRICECHARTING_BASE = "https://www.pricecharting.com/api/product";

export async function POST(req: NextRequest) {
  // 1. Protect with cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PRICECHARTING_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PriceCharting API key not configured" },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // 2. Only fetch lots that:
  //    - have qty_on_hand > 0
  //    - have never been refreshed OR were last refreshed > 12h ago
// ✅ 11 hours — ensures lots always get picked up at the next run
const elevenHoursAgo = new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString();

  const { data: lots, error: lotsError } = await supabase
    .from("inventory_lots")
    .select(
      "id, user_id, game, card_name, set_name, condition, variant, price_query_key"
    )
    .gt("qty_on_hand", 0)
    .or(`last_estimate_at.is.null,last_estimate_at.lt.${elevenHoursAgo}`);

  if (lotsError) {
    return NextResponse.json({ error: lotsError.message }, { status: 500 });
  }

  if (!lots || lots.length === 0) {
    return NextResponse.json({
      message: "No lots need refreshing",
      refreshed: 0,
    });
  }

  let refreshed = 0;
  let failed = 0;

  // 3. Loop and refresh each lot
  for (const lot of lots) {
    try {
      const query = [lot.card_name, lot.set_name, lot.game]
        .filter(Boolean)
        .join(" ");

      const url = new URL(PRICECHARTING_BASE);
      url.searchParams.set("t", apiKey);
      url.searchParams.set("q", query);

      const pcRes = await fetch(url.toString(), { cache: "no-store" });
      const pcData = await pcRes.json().catch(() => null);

      const status = pcData?.status === "success" ? "ok" : "not_found";

      const loose_price =
        typeof pcData?.["loose-price"] === "number"
          ? pcData["loose-price"] / 100
          : null;
      const graded_price =
        typeof pcData?.["graded-price"] === "number"
          ? pcData["graded-price"] / 100
          : null;
      const estimated_price = loose_price ?? graded_price ?? null;

      const source_url = pcData?.id
        ? `https://www.pricecharting.com/product/${encodeURIComponent(pcData.id)}`
        : null;

      const queryKey =
        lot.price_query_key ??
        [
          lot.game,
          lot.card_name,
          lot.set_name,
          lot.condition,
          lot.variant ?? "",
        ]
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
          .join("|");

      // Insert price estimate row
      await supabase.from("price_estimates").insert({
        inventory_lot_id: lot.id,
        user_id: lot.user_id,
        estimated_price,
        source: "pricecharting",
        source_url,
        currency: "USD",
        status,
        fetched_at: new Date().toISOString(),
      });

      // Update lot with latest price + query key
      await supabase
        .from("inventory_lots")
        .update({
          last_estimate_price: estimated_price,
          last_estimate_at: new Date().toISOString(),
          price_query_key: queryKey,
        })
        .eq("id", lot.id);

      refreshed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    message: "Cron complete",
    refreshed,
    failed,
    total: lots.length,
  });
}