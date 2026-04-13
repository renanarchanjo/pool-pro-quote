import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

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
      throw new Error("Apenas administradores podem gerenciar membros");
    }

    // Get caller's store
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("store_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.store_id) throw new Error("Loja não encontrada");

    // Rate limiting: 10 requests per IP per hour
    const clientIp = req.headers.get("x-forwarded-for") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";
    const { allowed } = await checkRateLimit(supabaseAdmin, clientIp, "invite-team-member", 10, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Handle role update
    if (body.action === "update_role") {
      const { target_user_id, role } = body;
      if (!target_user_id || !role) throw new Error("Dados inválidos");

      // Verify target belongs to same store
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("store_id")
        .eq("id", target_user_id)
        .single();

      if (!targetProfile || targetProfile.store_id !== callerProfile.store_id) {
        throw new Error("Usuário não pertence à sua loja");
      }

      const validRole = role === "owner" ? "owner" : "seller";

      await supabaseAdmin
        .from("user_roles")
        .update({ role: validRole })
        .eq("user_id", target_user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle invite (default action)
    const { email, password, full_name, role } = body;

    if (!email || !password || !full_name) {
      throw new Error("Email, senha e nome são obrigatórios");
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Formato de email inválido");
    }

    // Validate password strength: min 8 chars, at least one letter and one number
    if (typeof password !== "string" || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      throw new Error("Senha deve ter no mínimo 8 caracteres, incluindo letra e número");
    }

    // Verificar limite de membros (count eficiente)
    const { count: memberCount } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("store_id", callerProfile.store_id);

    if ((memberCount || 0) >= 10) {
      throw new Error("Limite de 10 usuários por loja atingido");
    }

    const validRole = role === "owner" ? "owner" : "seller";

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

    await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      store_id: callerProfile.store_id,
      full_name,
    });

    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: validRole,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[INVITE-TEAM-MEMBER] Error:", msg);
    // Only surface safe user-facing messages
    const safeMessages = [
      "Não autorizado",
      "Apenas administradores podem gerenciar membros",
      "Loja não encontrada",
      "Muitas tentativas. Aguarde.",
      "Dados inválidos",
      "Usuário não pertence à sua loja",
      "Email, senha e nome são obrigatórios",
      "Limite de 10 usuários por loja atingido",
      "Este email já está cadastrado",
      "Senha deve ter no mínimo 8 caracteres, incluindo letra e número",
    ];
    const clientMessage = safeMessages.some((s) => msg.includes(s))
      ? msg
      : "Erro ao gerenciar membro. Tente novamente.";
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
