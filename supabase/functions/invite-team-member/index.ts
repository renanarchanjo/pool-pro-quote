import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the calling user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Não autorizado");

    // Check caller is owner
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!callerRole || callerRole.role !== "owner") {
      throw new Error("Apenas administradores podem convidar membros");
    }

    // Get caller's store
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.store_id) throw new Error("Loja não encontrada");

    const { email, password, full_name, role } = await req.json();

    if (!email || !password || !full_name) {
      throw new Error("Email, senha e nome são obrigatórios");
    }

    const validRole = role === "owner" ? "owner" : "seller";

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        throw new Error("Este email já está cadastrado");
      }
      throw createError;
    }

    // Create profile linked to same store
    await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      store_id: callerProfile.store_id,
      full_name,
    });

    // Create role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: validRole,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
