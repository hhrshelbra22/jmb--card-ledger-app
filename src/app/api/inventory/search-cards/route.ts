import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabase/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuthUser();

    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const apiKey = process.env.PRICECHARTING_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const url = new URL("https://www.pricecharting.com/api/products");
    url.searchParams.set("t", apiKey);
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "success") {
      return NextResponse.json({ products: [] });
    }

    // Filter to only trading cards — exclude video games
    const cardKeywords = ["pokemon", "yugioh", "yu-gi-oh", "riftbound"];
    const filtered = (data.products ?? []).filter((p: { "console-name": string }) =>
      cardKeywords.some((k) =>
        p["console-name"].toLowerCase().includes(k)
      )
    );

    return NextResponse.json({ products: filtered });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}