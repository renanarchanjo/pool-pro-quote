import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
    if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Não autenticado");
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Não autenticado");

    // Rate limiting: 50 requests per IP per hour
    const clientIp = req.headers.get("x-forwarded-for") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";
    const { allowed } = await checkRateLimit(supabaseAdmin, clientIp, "accept-lead", 50, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { distribution_id } = await req.json();
    if (!distribution_id) throw new Error("distribution_id é obrigatório");

    // Get distribution
    const { data: dist, error: distError } = await supabaseAdmin
      .from("lead_distributions")
      .select("*")
      .eq("id", distribution_id)
      .single();

    if (distError || !dist) throw new Error("Distribuição não encontrada");
    if (dist.status === "accepted") {
      // Return success for idempotency — lead was already accepted
      return new Response(JSON.stringify({
        success: true,
        already_accepted: true,
        consumed: 0,
        limit: 0,
        is_excess: false,
        excess_price: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify user belongs to this store
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("store_id, daily_lead_limit")
      .eq("id", user.id)
      .single();

    if (!profile || profile.store_id !== dist.store_id) throw new Error("Acesso negado");

    // If lead is assigned to a specific user, only that user can accept
    if (dist.assigned_to && dist.assigned_to !== user.id) {
      // Check if user is owner (owners can always accept)
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .single();
      if (!roleData) {
        throw new Error("Este lead foi atribuído a outro membro da equipe");
      }
    }

    // Check daily limit for this user (0 = unlimited)
    const dailyLimit = profile.daily_lead_limit || 0;
    if (dailyLimit > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabaseAdmin
        .from("lead_distributions")
        .select("*", { count: "exact", head: true })
        .eq("store_id", dist.store_id)
        .eq("accepted_by", user.id)
        .eq("status", "accepted")
        .gte("accepted_at", todayStart.toISOString());

      if ((todayCount || 0) >= dailyLimit) {
        throw new Error(`Limite diário atingido (${dailyLimit} leads/dia). Solicite ao administrador para aumentar seu limite.`);
      }
    }

    // Get store info
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("lead_limit_monthly, lead_price_excess, lead_plan_active, stripe_customer_id, name")
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
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", distribution_id);

    if (updateError) throw new Error("Erro ao aceitar lead");

    // Insert log
    const { error: logErr } = await supabaseAdmin.from("lead_logs").insert({
      proposal_id: dist.proposal_id,
      store_id: dist.store_id,
      action: "accepted",
      performed_by: user.id,
      details: { consumed, limit, is_excess: isExcess, excess_price: isExcess ? excessPrice : 0 },
    });
    if (logErr) console.error("[ACCEPT-LEAD] Failed to insert log:", logErr.message);

    // Cobrança de lead excedente via Stripe invoice item
    if (isExcess && store.stripe_customer_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          // Valor em centavos (BRL)
          const amountCents = Math.round(excessPrice * 100);
          await stripe.invoiceItems.create({
            customer: store.stripe_customer_id,
            amount: amountCents,
            currency: "brl",
            description: `Lead excedente #${consumed} — ${store.name || "Loja"} (${new Date().toLocaleDateString("pt-BR")})`,
          });
          console.log(`[ACCEPT-LEAD] Excess lead billed: store=${dist.store_id}, amount=R$${excessPrice}, lead=${consumed}/${limit}`);
        } catch (stripeErr) {
          // Não bloquear aceite de lead por erro de cobrança
          console.error("[ACCEPT-LEAD] Stripe billing error (non-blocking):", stripeErr);
        }
      }
    } else if (isExcess) {
      console.log(`[ACCEPT-LEAD] Excess lead for store ${dist.store_id}: ${consumed}/${limit}. No Stripe customer — charge skipped.`);
    }

    // Send new lead email to store owner (fire-and-forget)
    try {
      const { data: proposal } = await supabaseAdmin
        .from("proposals")
        .select("customer_name, customer_city, customer_whatsapp, pool_models(name)")
        .eq("id", dist.proposal_id)
        .single();

      const { data: ownerRole } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "owner")
        .eq("user_id", (
          await supabaseAdmin.from("profiles").select("id").eq("store_id", dist.store_id)
        ).data?.map((p: any) => p.id) || [])
        .limit(1)
        .single();

      if (ownerRole) {
        const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(ownerRole.user_id);
        if (ownerAuth?.user?.email && proposal) {
          await supabaseAdmin.functions.invoke("send-email", {
            body: {
              type: "novo_lead",
              data: {
                email: ownerAuth.user.email,
                storeName: store ? `Loja ${dist.store_id}` : "",
                customerName: proposal.customer_name,
                customerCity: proposal.customer_city,
                customerWhatsapp: proposal.customer_whatsapp,
                modelName: (proposal as any).pool_models?.name || null,
              },
            },
            headers: { Authorization: authHeader },
          });
          console.log(`[ACCEPT-LEAD] Lead email sent to owner ${ownerAuth.user.id}`);
        }
      }
    } catch (emailErr) {
      console.error("[ACCEPT-LEAD] Lead email failed (non-blocking):", emailErr);
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
