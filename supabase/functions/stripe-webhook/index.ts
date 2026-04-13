import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!signature || !webhookSecret || !stripeKey) {
    return new Response("Missing configuration", { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        let customerEmail = session.customer_email;
        if (!customerEmail && session.customer) {
          try {
            const cust = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
            customerEmail = cust.email;
          } catch (custErr) {
            console.error("[STRIPE-WEBHOOK] Failed to retrieve customer:", custErr);
            break;
          }
        }
        if (!customerEmail) {
          console.error("[STRIPE-WEBHOOK] No customer email for session:", session.id);
          break;
        }

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) {
          console.error("[STRIPE-WEBHOOK] No price found in subscription:", subscriptionId);
          break;
        }

        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        const periodEnd = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        const storeId = await getStoreIdByEmail(supabase, customerEmail);
        if (!storeId) {
          console.error("[STRIPE-WEBHOOK] No store found for checkout email");
          break;
        }

        const { error: updateErr } = await supabase
          .from("stores")
          .update({
            plan_id: plan?.id ?? null,
            plan_status: "active",
            plan_started_at: new Date().toISOString(),
            plan_expires_at: periodEnd,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
          })
          .eq("id", storeId);

        if (updateErr) console.error("[STRIPE-WEBHOOK] Failed to update store:", updateErr.message);
        console.log(`[STRIPE-WEBHOOK] Checkout completed for subscription: ${subscriptionId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        const periodEnd = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        const customer = await stripe.customers.retrieve(
          customerId
        ) as Stripe.Customer;

        const storeId = await getStoreIdByEmail(
          supabase, 
          customer.email ?? ""
        );
        if (!storeId) break;

        await supabase
          .from("stores")
          .update({
            plan_status: "active",
            plan_expires_at: periodEnd,
          })
          .eq("id", storeId);

        const { error: payInsertErr } = await supabase.from("payment_history").insert({
          store_id: storeId,
          amount: (invoice.amount_paid || 0) / 100,
          status: "paid",
          payment_date: new Date().toISOString(),
          period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null,
          stripe_payment_id: invoice.payment_intent as string,
        });
        if (payInsertErr) console.error("[STRIPE-WEBHOOK] Failed to insert payment:", payInsertErr.message);

        console.log(`[STRIPE-WEBHOOK] Payment succeeded: ${storeId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const customer = await stripe.customers.retrieve(
          customerId
        ) as Stripe.Customer;

        const storeId = await getStoreIdByEmail(
          supabase,
          customer.email ?? ""
        );
        if (!storeId) break;

        await supabase
          .from("stores")
          .update({ plan_status: "past_due" })
          .eq("id", storeId);

        const { error: failInsertErr } = await supabase.from("payment_history").insert({
          store_id: storeId,
          amount: (invoice.amount_due || 0) / 100,
          status: "failed",
          payment_date: new Date().toISOString(),
          stripe_payment_id: invoice.payment_intent as string,
        });
        if (failInsertErr) console.error("[STRIPE-WEBHOOK] Failed to insert payment:", failInsertErr.message);

        console.log(`[STRIPE-WEBHOOK] Payment failed: ${storeId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(
          customerId
        ) as Stripe.Customer;

        const storeId = await getStoreIdByEmail(
          supabase,
          customer.email ?? ""
        );
        if (!storeId) break;

        await supabase
          .from("stores")
          .update({
            plan_status: "canceled",
            plan_expires_at: new Date().toISOString(),
            stripe_subscription_id: null,
          })
          .eq("id", storeId);

        console.log(`[STRIPE-WEBHOOK] Subscription canceled: ${storeId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(
          customerId
        ) as Stripe.Customer;

        const storeId = await getStoreIdByEmail(
          supabase,
          customer.email ?? ""
        );
        if (!storeId) break;

        const periodEnd = new Date(
          subscription.current_period_end * 1000
        ).toISOString();

        const status = subscription.cancel_at_period_end 
          ? "canceling" 
          : subscription.status === "active" 
            ? "active" 
            : subscription.status;

        await supabase
          .from("stores")
          .update({
            plan_status: status,
            plan_expires_at: periodEnd,
          })
          .eq("id", storeId);

        console.log(`[STRIPE-WEBHOOK] Subscription updated: ${storeId} → ${status}`);
        break;
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[STRIPE-WEBHOOK] Processing error:", err);
    return new Response(
      JSON.stringify({ error: "Processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function getStoreIdByEmail(
  supabase: any,
  email: string
): Promise<string | null> {
  if (!email) return null;

  try {
    const { data: userData, error } = await supabase.auth.admin.getUserByEmail(email);
    if (error || !userData?.user) {
      console.error("[STRIPE-WEBHOOK] getUserByEmail failed:", error?.message ?? "user not found");
      return null;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("store_id")
      .eq("id", userData.user.id)
      .single();

    if (profileErr) {
      console.error("[STRIPE-WEBHOOK] Profile lookup failed:", profileErr.message);
      return null;
    }

    return profile?.store_id ?? null;
  } catch (err) {
    console.error("[STRIPE-WEBHOOK] getStoreIdByEmail error:", err);
    return null;
  }
}
