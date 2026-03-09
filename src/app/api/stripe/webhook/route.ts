import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from "@/lib/supabase/stripe";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await verifyWebhook(body, signature);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  console.log(`[webhook] Received: ${event.type} | id: ${event.id}`);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        console.log(`[webhook] ✅ checkout.session.completed`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        console.log(`[webhook] ✅ customer.subscription.updated | status: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        console.log(`[webhook] ✅ customer.subscription.deleted`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        console.log(`[webhook] ⚠️ invoice.payment_failed`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        console.log(`[webhook] ✅ invoice.payment_succeeded`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.type}:`, err);
    // Return 200 so Stripe doesn't keep retrying — error is logged above
    return NextResponse.json(
      { error: "Webhook handler failed", received: true },
      { status: 200 }
    );
  }

  return NextResponse.json({ received: true });
}