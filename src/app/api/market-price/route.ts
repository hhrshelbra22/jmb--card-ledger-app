import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/supabase/profiles";

function handleError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

const PRICECHARTING_BASE = "https://www.pricecharting.com/api/product";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
    }
    const isPro = profile.role === "pro" || profile.role === "dealer";
    // if (!isPro) {
    //   return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
    // }

    const { searchParams } = req.nextUrl;
    const cardName = searchParams.get("cardName")?.trim() ?? "";
    const game = searchParams.get("game") ?? "";
    const setName = searchParams.get("setName") ?? "";
    const _condition = searchParams.get("condition") ?? "";

    if (!cardName || cardName.length < 3) {
      return NextResponse.json(
        { error: "cardName is required and must be at least 3 characters" },
        { status: 422 }
      );
    }

    const apiKey = process.env.PRICECHARTING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Market price service is temporarily unavailable" },
        { status: 503 }
      );
    }

    const query = [cardName, setName, game].filter(Boolean).join(" ");
    const url = new URL(PRICECHARTING_BASE);
    url.searchParams.set("t", apiKey);
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!data || data.status !== "success") {
      return NextResponse.json(
        { error: "Card not found in PriceCharting" },
        { status: 404 }
      );
    }

    const id = data.id ?? "";
    const loosePricePennies = typeof data["loose-price"] === "number" ? data["loose-price"] : null;
    const gradedPricePennies = typeof data["graded-price"] === "number" ? data["graded-price"] : null;

    const loose_price = loosePricePennies != null ? loosePricePennies / 100 : null;
    const graded_price = gradedPricePennies != null ? gradedPricePennies / 100 : null;
    const estimated_value_each = loose_price ?? graded_price ?? null;

    if (estimated_value_each == null) {
      return NextResponse.json(
        { error: "Card not found in PriceCharting" },
        { status: 404 }
      );
    }

    const source_url = id
      ? `https://www.pricecharting.com/product/${encodeURIComponent(id)}`
      : undefined;

    return NextResponse.json({
      estimated_value_each,
      loose_price,
      graded_price,
      source_url,
    });
  } catch (e) {
    return handleError(e);
  }
}
