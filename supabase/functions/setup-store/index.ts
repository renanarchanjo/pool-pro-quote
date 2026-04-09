import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://simulapool.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- AUTH CHECK ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let createdStoreId: string | null = null;

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

    // --- INPUT VALIDATION ---
    if (!userId || !storeName || !slug) {
      throw new Error("Missing required fields: userId, storeName, slug");
    }

    // Verify the authenticated user matches the userId in the request
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: userId mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (typeof storeName !== "string" || storeName.length > 200) {
      throw new Error("Invalid storeName");
    }
    if (typeof slug !== "string" || slug.length > 100 || !/^[a-z0-9-]+$/.test(slug)) {
      throw new Error("Invalid slug format");
    }
    if (typeof userId !== "string" || userId.length !== 36) {
      throw new Error("Invalid userId format");
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

    // Fetch default plan dynamically
    const { data: defaultPlan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("slug", "gratuito")
      .eq("active", true)
      .single();

    const planId = defaultPlan?.id ?? null;

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
        plan_id: planId,
        plan_status: planId ? "active" : "trial",
      })
      .select()
      .single();

    if (storeError) throw new Error(`Store creation failed: ${storeError.message}`);
    createdStoreId = storeData.id;
    console.log(`[SETUP-STORE] Store created: ${createdStoreId}`);

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
    // Rollback: remove partially created resources
    if (createdStoreId) {
      await supabaseAdmin.from("store_settings").delete().eq("store_id", createdStoreId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
      await supabaseAdmin.from("profiles").delete().eq("id", user.id);
      await supabaseAdmin.from("stores").delete().eq("id", createdStoreId);
      console.log("[SETUP-STORE] Rollback completed for store:", createdStoreId);
    }

    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SETUP-STORE] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
