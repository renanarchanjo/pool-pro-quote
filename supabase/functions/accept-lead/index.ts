import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Não autenticado");

    const { distribution_id } = await req.json();
    if (!distribution_id) throw new Error("distribution_id é obrigatório");

    // Get distribution
    const { data: dist, error: distError } = await supabaseAdmin
      .from("lead_distributions")
      .select("*")
      .eq("id", distribution_id)
      .single();

    if (distError || !dist) throw new Error("Distribuição não encontrada");
    if (dist.status === "accepted") throw new Error("Lead já aceito");

    // Verify user belongs to this store
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.store_id !== dist.store_id) throw new Error("Acesso negado");

    // Get store info
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("lead_limit_monthly, lead_price_excess, lead_plan_active")
      .eq("id", dist.store_id)
      .single();

    if (!store) throw new Error("Loja não encontrada");
    if (!store.lead_plan_active) throw new Error("Plano de leads não ativo");

    // Count consumed this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabaseAdmin
      .from("lead_distributions")
      .select("*", { count: "exact", head: true })
      .eq("store_id", dist.store_id)
      .eq("status", "accepted")
      .gte("accepted_at", monthStart);

    const consumed = (count || 0) + 1;
    const limit = store.lead_limit_monthly || 100;
    const isExcess = consumed > limit;
    const excessPrice = store.lead_price_excess || 25;

    // Accept the lead
    const { error: updateError } = await supabaseAdmin
      .from("lead_distributions")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", distribution_id);

    if (updateError) throw new Error("Erro ao aceitar lead");

    // Insert log
    await supabaseAdmin.from("lead_logs").insert({
      proposal_id: dist.proposal_id,
      store_id: dist.store_id,
      action: "accepted",
      performed_by: user.id,
      details: { consumed, limit, is_excess: isExcess, excess_price: isExcess ? excessPrice : 0 },
    });

    // TODO: Stripe metered billing for excess leads
    // When configured, report +1 usage to the store's Stripe subscription metered item
    if (isExcess) {
      console.log(`[ACCEPT-LEAD] Excess lead for store ${dist.store_id}: ${consumed}/${limit}. Charge: ${excessPrice}`);
      // Future: stripe.subscriptionItems.createUsageRecord(itemId, { quantity: 1, action: 'increment' })
    }

    return new Response(JSON.stringify({
      success: true,
      consumed,
      limit,
      is_excess: isExcess,
      excess_price: isExcess ? excessPrice : 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[ACCEPT-LEAD] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
