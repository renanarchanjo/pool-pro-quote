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

    const email = "simulapool@gmal.com";
    const password = "Faffran0568@";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userError) throw userError;
      userId = userData.user.id;
    }

    // Create profile (no store_id - this is a global admin)
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      store_id: null,
      full_name: "SIMULAPOOL Matriz",
    }, { onConflict: "id" });

    if (profileError) console.error("Profile error:", profileError);

    // Create super_admin role
    const { error: roleError } = await supabase.from("user_roles").upsert({
      user_id: userId,
      role: "super_admin",
    }, { onConflict: "user_id,role" });

    if (roleError) console.error("Role error:", roleError);

    return new Response(JSON.stringify({ message: "Matriz account created", userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
