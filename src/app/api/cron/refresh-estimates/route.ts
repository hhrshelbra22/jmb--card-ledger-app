import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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

  const supabase = await createSupabaseServiceClient();

  // 2. Fetch lots needing refresh:
  //    - qty_on_hand > 0
  //    - never refreshed OR last refreshed > 11h ago
  const elevenHoursAgo = new Date(
    Date.now() - 11 * 60 * 60 * 1000
  ).toISOString();

  // Use two separate queries and merge — avoids .or() timestamp parsing issues
  const [nullResult, staleResult] = await Promise.all([
    // Lots never refreshed
    supabase
      .from("inventory_lots")
      .select("id, user_id, game, card_name, set_name, condition, variant, price_query_key, last_estimate_at")
      .gt("qty_on_hand", 0)
      .is("last_estimate_at", null),

    // Lots refreshed more than 11h ago
    supabase
      .from("inventory_lots")
      .select("id, user_id, game, card_name, set_name, condition, variant, price_query_key, last_estimate_at")
      .gt("qty_on_hand", 0)
      .lt("last_estimate_at", elevenHoursAgo),
  ]);

  if (nullResult.error) {
    return NextResponse.json({ error: nullResult.error.message }, { status: 500 });
  }
  if (staleResult.error) {
    return NextResponse.json({ error: staleResult.error.message }, { status: 500 });
  }

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const lots = [...(nullResult.data ?? []), ...(staleResult.data ?? [])].filter(
    (lot) => {
      if (seen.has(lot.id)) return false;
      seen.add(lot.id);
      return true;
    }
  );

  // Debug info always returned
  const debug = {
    cutoff: elevenHoursAgo,
    never_refreshed: nullResult.data?.length ?? 0,
    stale: staleResult.data?.length ?? 0,
    total_to_refresh: lots.length,
    sample_lot: lots[0]
      ? {
          id: lots[0].id,
          card_name: lots[0].card_name,
          last_estimate_at: lots[0].last_estimate_at,
        }
      : null,
  };

  if (lots.length === 0) {
    return NextResponse.json({
      message: "No lots need refreshing",
      refreshed: 0,
      debug,
    });
  }

  let refreshed = 0;
  let failed = 0;
  const errors: string[] = [];

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
        [lot.game, lot.card_name, lot.set_name, lot.condition, lot.variant ?? ""]
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
          .join("|");

      // Insert price estimate row
      const { error: insertError } = await supabase
        .from("price_estimates")
        .insert({
          inventory_lot_id: lot.id,
          user_id: lot.user_id,
          estimated_price,
          source: "pricecharting",
          source_url,
          currency: "USD",
          status,
          fetched_at: new Date().toISOString(),
        });

      if (insertError) {
        errors.push(`insert ${lot.id}: ${insertError.message}`);
        failed++;
        continue;
      }

      // Update lot with latest price + query key
      const { error: updateError } = await supabase
        .from("inventory_lots")
        .update({
          last_estimate_price: estimated_price,
          last_estimate_at: new Date().toISOString(),
          price_query_key: queryKey,
        })
        .eq("id", lot.id);

      if (updateError) {
        errors.push(`update ${lot.id}: ${updateError.message}`);
        failed++;
        continue;
      }

      refreshed++;
    } catch (e) {
      failed++;
      errors.push(`exception ${lot.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    message: "Cron complete",
    refreshed,
    failed,
    total: lots.length,
    errors: errors.length > 0 ? errors : undefined,
    debug,
  });
}