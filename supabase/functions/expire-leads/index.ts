import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get configurable expiration hours from platform_settings
    const { data: setting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "lead_expiration_hours")
      .single();

    const expirationHours = parseInt(setting?.value || "48", 10);
    const cutoffDate = new Date(Date.now() - expirationHours * 60 * 60 * 1000).toISOString();

    // Find pending distributions older than cutoff
    const { data: expiredDistributions, error: fetchError } = await supabase
      .from("lead_distributions")
      .select("id, proposal_id, store_id, created_at")
      .eq("status", "pending")
      .lt("created_at", cutoffDate);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!expiredDistributions || expiredDistributions.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum lead expirado", expired: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to 'expired'
    const expiredIds = expiredDistributions.map((d: any) => d.id);
    const { error: updateError } = await supabase
      .from("lead_distributions")
      .update({ status: "expired" })
      .in("id", expiredIds);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    // Log the expirations
    const logs = expiredDistributions.map((d: any) => ({
      proposal_id: d.proposal_id,
      store_id: d.store_id,
      action: "lead_expired",
      details: {
        expiration_hours: expirationHours,
        distributed_at: d.created_at,
        expired_at: new Date().toISOString(),
      },
    }));

    await supabase.from("lead_logs").insert(logs);

    console.log(`Expired ${expiredIds.length} lead distributions`);

    return new Response(
      JSON.stringify({
        message: `${expiredIds.length} lead(s) expirado(s) e disponíveis para redistribuição`,
        expired: expiredIds.length,
        expiration_hours: expirationHours,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in expire-leads:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
