import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRICECHARTING_BASE = "https://www.pricecharting.com/api/product";
const RATE_LIMIT_MINUTES = 15;

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id } = await ctx.params;
    const supabase = await createSupabaseServerClient();

    // 1. Get the lot — verify it belongs to this user
    const { data: lot, error: lotError } = await supabase
      .from("inventory_lots")
      .select("id, user_id, price_query_key, variant , last_estimate_at, game, card_name, set_name, condition")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    // 2. Rate limit — max 1 refresh per 15 min per lot
    if (lot.last_estimate_at) {
      const minutesSince = (Date.now() - new Date(lot.last_estimate_at).getTime()) / 1000 / 60;
      if (minutesSince < RATE_LIMIT_MINUTES) {
        const waitMinutes = Math.ceil(RATE_LIMIT_MINUTES - minutesSince);
        return NextResponse.json(
          { error: `Rate limited. Try again in ${waitMinutes} minute(s).` },
          { status: 429 }
        );
      }
    }

    // 3. Build price_query_key if missing
    const queryKey =
      lot.price_query_key ??
      [lot.game, lot.card_name, lot.set_name, lot.condition,  lot.variant ?? ""]
        .map((s: string) => s.trim().toLowerCase())
        .join("|");

    // 4. Call PriceCharting — server-side only, key never exposed to client
    const apiKey = process.env.PRICECHARTING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Market price service is temporarily unavailable" },
        { status: 503 }
      );
    }

    const query = [lot.card_name, lot.set_name, lot.game].filter(Boolean).join(" ");
    const url = new URL(PRICECHARTING_BASE);
    url.searchParams.set("t", apiKey);
    url.searchParams.set("q", query);

    const pcRes = await fetch(url.toString(), { cache: "no-store" });
    const pcData = await pcRes.json().catch(() => null);

    // 5. Parse response
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

    // 6. Insert into price_estimates
    const { error: insertError } = await supabase
      .from("price_estimates")
      .insert({
        inventory_lot_id: id,
        user_id: user.id,
        estimated_price,
        source: "pricecharting",
        source_url,
        currency: "USD",
        status,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) throw new Error(insertError.message);

    // 7. Update lot with latest price + query key
    const { error: updateError } = await supabase
      .from("inventory_lots")
      .update({
        last_estimate_price: estimated_price,
        last_estimate_at: new Date().toISOString(),
        price_query_key: queryKey,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      estimated_price,
      status,
      source_url,
      fetched_at: new Date().toISOString(),
    });
  } catch (e) {
    return handleError(e);
  }
}