import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = "admin@simulapool.com.br";
    const password = "SenhaForte@123";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Create user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userError) throw userError;
      userId = userData.user.id;
    }


    // Get or create store
    let storeId: string;
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", "simulapool-demo")
      .single();

    if (existingStore) {
      storeId = existingStore.id;
    } else {
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .insert({ name: "SimulaPool Demo", slug: "simulapool-demo" })
        .select()
        .single();
      if (storeError) throw storeError;
      storeId = storeData.id;
    }

    // Create profile
    await supabase.from("profiles").insert({
      id: userId,
      store_id: storeId,
      full_name: "Francisco",
    });

    // Create owner role
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "owner",
    });

    // Create store settings (upsert)
    await supabase.from("store_settings").upsert({
      store_id: storeId,
    }, { onConflict: "store_id" });

    return new Response(JSON.stringify({ message: "Test account created", userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
