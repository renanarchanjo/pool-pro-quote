import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-STRIPE-PRICE] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Validate super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) throw new Error("Unauthorized: super_admin required");

    const { plan_id, new_price_monthly, plan_name } = await req.json();
    if (!plan_id || new_price_monthly === undefined) {
      throw new Error("plan_id and new_price_monthly are required");
    }

    logStep("Starting price sync", { plan_id, new_price_monthly, plan_name });

    // Get current plan data
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) throw new Error("Plan not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const amountInCents = Math.round(new_price_monthly * 100);

    // If plan has no Stripe product yet, create one
    let productId = plan.stripe_product_id;
    if (!productId) {
      logStep("Creating new Stripe product", { name: plan_name || plan.name });
      const product = await stripe.products.create({
        name: plan_name || plan.name,
        metadata: { supabase_plan_id: plan_id },
      });
      productId = product.id;
    } else {
      // Update product name if changed
      if (plan_name && plan_name !== plan.name) {
        await stripe.products.update(productId, { name: plan_name });
        logStep("Updated product name", { productId, name: plan_name });
      }
    }

    // If price is 0, skip Stripe price creation
    if (amountInCents === 0) {
      logStep("Price is 0, skipping Stripe price creation");
      await supabase
        .from("subscription_plans")
        .update({
          price_monthly: new_price_monthly,
          stripe_product_id: productId,
          stripe_price_id: null,
          name: plan_name || plan.name,
        })
        .eq("id", plan_id);

      return new Response(JSON.stringify({
        success: true,
        new_price_id: null,
        product_id: productId,
        migrated_subscriptions: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new Stripe Price
    logStep("Creating new Stripe price", { productId, amountInCents });
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: amountInCents,
      currency: "brl",
      recurring: { interval: "month" },
      metadata: { supabase_plan_id: plan_id },
    });
    logStep("New price created", { priceId: newPrice.id });

    // Archive old price if exists
    const oldPriceId = plan.stripe_price_id;
    let migratedCount = 0;

    if (oldPriceId && oldPriceId !== newPrice.id) {
      // Find all active subscriptions using the old price
      logStep("Looking for active subscriptions with old price", { oldPriceId });
      const subscriptions = await stripe.subscriptions.list({
        price: oldPriceId,
        status: "active",
        limit: 100,
      });

      logStep("Found subscriptions to migrate", { count: subscriptions.data.length });

      // Migrate each subscription to the new price
      for (const sub of subscriptions.data) {
        try {
          const subItem = sub.items.data.find(
            (item) => item.price.id === oldPriceId
          );
          if (!subItem) continue;

          await stripe.subscriptions.update(sub.id, {
            items: [
              {
                id: subItem.id,
                price: newPrice.id,
              },
            ],
            proration_behavior: "none",
          });
          migratedCount++;
          logStep("Migrated subscription", { subId: sub.id });
        } catch (err) {
          logStep("Error migrating subscription", { subId: sub.id, error: String(err) });
        }
      }

      // Archive old price
      try {
        await stripe.prices.update(oldPriceId, { active: false });
        logStep("Archived old price", { oldPriceId });
      } catch (err) {
        logStep("Error archiving old price", { error: String(err) });
      }
    }

    // Update DB with new Stripe IDs
    await supabase
      .from("subscription_plans")
      .update({
        price_monthly: new_price_monthly,
        stripe_price_id: newPrice.id,
        stripe_product_id: productId,
        name: plan_name || plan.name,
      })
      .eq("id", plan_id);

    logStep("Done", { newPriceId: newPrice.id, migratedCount });

    return new Response(JSON.stringify({
      success: true,
      new_price_id: newPrice.id,
      product_id: productId,
      migrated_subscriptions: migratedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
