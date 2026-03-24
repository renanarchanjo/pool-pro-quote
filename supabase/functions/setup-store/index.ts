import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const {
      userId,
      storeName,
      slug,
      city,
      state,
      cnpj,
      razaoSocial,
      nomeFantasia,
      fullName,
    } = await req.json();

    if (!userId || !storeName || !slug) {
      throw new Error("Missing required fields: userId, storeName, slug");
    }

    console.log(`[SETUP-STORE] Starting for user ${userId}, store: ${storeName}`);

    // Check if profile already exists (prevents duplicates on repeated signups)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      console.log(`[SETUP-STORE] Profile already exists for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Store already configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 1. Create store
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        name: storeName,
        slug,
        city: city || null,
        state: state || null,
        cnpj: cnpj || null,
        razao_social: razaoSocial || null,
        nome_fantasia: nomeFantasia || null,
        plan_id: "08976d95-652c-4f59-926f-0080c335ea71",
        plan_status: "active",
      })
      .select()
      .single();

    if (storeError) throw new Error(`Store creation failed: ${storeError.message}`);
    console.log(`[SETUP-STORE] Store created: ${storeData.id}`);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        store_id: storeData.id,
        full_name: fullName || storeName,
      });

    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

    // 3. Create role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "owner",
      });

    if (roleError) throw new Error(`Role creation failed: ${roleError.message}`);

    // 4. Create store settings
    const { error: settingsError } = await supabaseAdmin
      .from("store_settings")
      .insert({
        store_id: storeData.id,
      });

    if (settingsError) throw new Error(`Settings creation failed: ${settingsError.message}`);

    console.log(`[SETUP-STORE] Complete for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, storeId: storeData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SETUP-STORE] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
