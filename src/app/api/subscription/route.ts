import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireAuthUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/supabase/profiles";
import { getStripe } from "@/lib/supabase/stripe";

/** Stripe Subscription with period fields (present in API, sometimes omitted in SDK typings). */
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

export async function GET() {
  try {
    const user = await requireAuthUser();
    const profile = await getProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        { plan: "free", renewalDate: null, status: null },
        { status: 200 }
      );
    }

    const isPro =
      profile.role === "pro" || profile.role === "dealer";
    if (!profile.stripe_subscription_id || profile.subscription_status !== "active") {
      return NextResponse.json(
        {
          plan: isPro ? "pro" : "free",
          renewalDate: null,
          status: profile.subscription_status ?? null,
        },
        { status: 200 }
      );
    }

    const stripe = getStripe();
    const subscription = (await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id,
      { expand: ["items.data.price"] }
    )) as SubscriptionWithPeriod;

    const periodEnd = subscription.current_period_end;
    const renewalDate =
      periodEnd != null
        ? new Date(periodEnd * 1000).toISOString().slice(0, 10)
        : null;

    return NextResponse.json({
      plan: "pro",
      renewalDate,
      status: subscription.status,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to load subscription" },
      { status: 500 }
    );
  }
}
