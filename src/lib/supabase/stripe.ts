import Stripe from "stripe";
import { createSupabaseServiceClient } from "./server";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

// Helper to safely extract current_period_end across Stripe API versions
function getPeriodEnd(subscription: unknown): string | null {
  const sub = subscription as Record<string, unknown>;
  const items = sub.items as { data?: { current_period_end?: number }[] } | undefined;
  const seconds =
    (sub.current_period_end as number | undefined) ??
    (items?.data?.[0]?.current_period_end) ??
    null;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;
  const userId = session.metadata?.user_id as string | undefined;

  if (!userId) {
    console.error("[stripe] No user_id in checkout session metadata");
    return;
  }

  let periodEnd: string | null = null;
  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    periodEnd = getPeriodEnd(subscription);
  }

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("profiles")
    .update({
      role: "pro",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
      current_period_end: periodEnd,
    })
    .eq("id", userId);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = createSupabaseServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscription.id);

  if (!profiles?.length) {
    console.error("[stripe] No profile found for subscription:", subscription.id);
    return;
  }

  const periodEnd = getPeriodEnd(subscription);
  const sub = subscription as any;
  const isCanceledAtPeriodEnd = sub.cancel_at_period_end === true;

  await supabase
    .from("profiles")
    .update({
      role: "pro",                          // keep pro until deleted event fires
      subscription_status: isCanceledAtPeriodEnd ? "canceled" : subscription.status,
      current_period_end: periodEnd,
    })
    .eq("id", profiles[0].id);

  console.log(`[stripe] Subscription updated | cancel_at_period_end: ${isCanceledAtPeriodEnd} | status: ${subscription.status}`);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = createSupabaseServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscription.id);

  if (profiles?.length) {
    await supabase
      .from("profiles")
      .update({
        role: "free",
        stripe_subscription_id: null,
        subscription_status: "canceled",
        current_period_end: null,
      })
      .eq("id", profiles[0].id);
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscription === "string" ? subscription : subscription?.id;
  if (!subscriptionId) return;

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("profiles")
    .update({
      role: "free",
      subscription_status: "past_due",
    })
    .eq("stripe_subscription_id", subscriptionId);
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscription === "string" ? subscription : subscription?.id;
  if (!subscriptionId) return;

  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const periodEnd = getPeriodEnd(stripeSubscription);

  const supabase = createSupabaseServiceClient();
  await supabase
    .from("profiles")
    .update({
      role: "pro",
      subscription_status: "active",
      current_period_end: periodEnd,
    })
    .eq("stripe_subscription_id", subscriptionId);
}

export async function verifyWebhook(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    secret
  ) as Stripe.Event;
}