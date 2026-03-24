import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ==================== TIPOS ====================
interface NormalizedEvent {
  tipo: string;
  userId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface NotificationPayload {
  userId: string;
  titulo: string;
  mensagem: string;
  prioridade: "CRITICO" | "URGENTE" | "NORMAL";
  alertType: string;
}

// ==================== FUNÇÕES UTILITÁRIAS ====================

function generateHash(userId: string, titulo: string, mensagem: string): string {
  const raw = `${userId}:${titulo}:${mensagem}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ==================== 1. DETECÇÃO DE EVENTOS ====================

async function detectarEventos(supabase: any, periodo: string) {
  const now = new Date();
  const events: NormalizedEvent[] = [];

  // Buscar todos os owners com store
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, store_id, full_name")
    .not("store_id", "is", null);

  if (!profiles?.length) return events;

  for (const profile of profiles) {
    const storeId = profile.store_id;
    const userId = profile.id;

    // Verificar se é owner
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "super_admin"]);

    if (!roleData?.length) continue;

    // --- Leads novos (últimas 24h ou desde último cron) ---
    const hoursBack = periodo === "manha" ? 16 : periodo === "acompanhamento" ? 7 : 4;
    const since = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

    // Para owners: checar lead_distributions
    const isOwner = roleData.some((r: any) => r.role === "owner");
    const isSuperAdmin = roleData.some((r: any) => r.role === "super_admin");

    if (isOwner) {
      const { data: newLeads, count: leadsCount } = await supabase
        .from("lead_distributions")
        .select("id", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "pending")
        .gte("created_at", since);

      if (leadsCount && leadsCount > 0) {
        events.push({
          tipo: "leads_novos",
          userId,
          payload: { count: leadsCount, storeId },
          timestamp: now,
        });
      }

      // Propostas não enviadas (status = "nova" há mais de 24h)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { count: pendingCount } = await supabase
        .from("proposals")
        .select("id", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "nova")
        .lt("created_at", oneDayAgo);

      if (pendingCount && pendingCount > 0) {
        events.push({
          tipo: "propostas_pendentes",
          userId,
          payload: { count: pendingCount, storeId },
          timestamp: now,
        });
      }

      // Propostas perdidas (últimas 24h)
      const { count: lostCount } = await supabase
        .from("proposals")
        .select("id", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "perdida")
        .gte("created_at", since);

      if (lostCount && lostCount > 0) {
        events.push({
          tipo: "propostas_perdidas",
          userId,
          payload: { count: lostCount, storeId },
          timestamp: now,
        });
      }

      // Performance: taxa de conversão
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: totalProposals } = await supabase
        .from("proposals")
        .select("id", { count: "exact" })
        .eq("store_id", storeId)
        .gte("created_at", thirtyDaysAgo);

      const { count: closedProposals } = await supabase
        .from("proposals")
        .select("id", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "fechada")
        .gte("created_at", thirtyDaysAgo);

      if (totalProposals && totalProposals > 5) {
        const conversionRate = (closedProposals || 0) / totalProposals;
        if (conversionRate < 0.1) {
          events.push({
            tipo: "queda_performance",
            userId,
            payload: { conversionRate: Math.round(conversionRate * 100), totalProposals, closedProposals, storeId },
            timestamp: now,
          });
        }
      }
    }

    // Para super_admin: resumo geral
    if (isSuperAdmin && periodo === "resumo") {
      const { count: totalNewLeads } = await supabase
        .from("proposals")
        .select("id", { count: "exact" })
        .eq("status", "nova")
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      const { count: totalStores } = await supabase
        .from("stores")
        .select("id", { count: "exact" });

      events.push({
        tipo: "resumo_diario",
        userId,
        payload: { totalNewLeads: totalNewLeads || 0, totalStores: totalStores || 0 },
        timestamp: now,
      });
    }
  }

  return events;
}

// ==================== 2. NORMALIZAÇÃO ====================

function normalizarEventos(eventos: NormalizedEvent[]): NormalizedEvent[] {
  return eventos.map((e) => ({
    tipo: e.tipo,
    userId: e.userId,
    payload: e.payload,
    timestamp: e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp),
  }));
}

// ==================== 3. PRIORIDADE ====================

function definirPrioridade(tipo: string): "CRITICO" | "URGENTE" | "NORMAL" {
  switch (tipo) {
    case "queda_performance": return "CRITICO";
    case "propostas_perdidas": return "URGENTE";
    default: return "NORMAL";
  }
}

// ==================== 4. AGRUPAMENTO INTELIGENTE ====================

function gerarMensagem(eventosDoUsuario: NormalizedEvent[]): { titulo: string; mensagem: string; alertType: string } {
  const parts: string[] = [];
  let alertType = "resumo";

  for (const ev of eventosDoUsuario) {
    switch (ev.tipo) {
      case "leads_novos":
        parts.push(`📩 ${ev.payload.count} lead(s) novo(s) aguardando`);
        alertType = "leads_novos";
        break;
      case "propostas_pendentes":
        parts.push(`📋 ${ev.payload.count} proposta(s) não enviada(s)`);
        alertType = "propostas_pendentes";
        break;
      case "propostas_perdidas":
        parts.push(`❌ ${ev.payload.count} proposta(s) perdida(s)`);
        alertType = "propostas_perdidas";
        break;
      case "queda_performance":
        parts.push(`⚠️ Conversão em ${ev.payload.conversionRate}%`);
        alertType = "queda_performance";
        break;
      case "resumo_diario":
        parts.push(`📊 ${ev.payload.totalNewLeads} leads hoje | ${ev.payload.totalStores} lojas`);
        alertType = "resumo_diario";
        break;
    }
  }

  if (parts.length === 0) {
    return { titulo: "", mensagem: "", alertType: "" };
  }

  const titulo = parts.length > 1 ? "📊 Resumo SIMULAPOOL" : parts[0].substring(0, 50);
  const mensagem = parts.join(" | ");

  return { titulo, mensagem, alertType };
}

// ==================== 5. CONTROLE DE SPAM ====================

async function podeEnviar(supabase: any, userId: string, alertType: string): Promise<boolean> {
  const now = new Date();

  // Limite: máximo 5 notificações por dia
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { count: dailyCount } = await supabase
    .from("notification_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());

  if (dailyCount && dailyCount >= 5) return false;

  // Intervalo mínimo: 60 minutos por tipo
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("notification_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("alert_type", alertType)
    .gte("created_at", oneHourAgo);

  if (recentCount && recentCount > 0) return false;

  return true;
}

// ==================== 6. DEDUPLICAÇÃO ====================

async function hashJaExiste(supabase: any, hash: string): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("notification_logs")
    .select("id", { count: "exact" })
    .eq("hash", hash)
    .gte("created_at", startOfDay.toISOString());

  return (count || 0) > 0;
}

// ==================== 7. ENVIO ONESIGNAL ====================

async function enviarPush(payload: NotificationPayload, supabase: any): Promise<boolean> {
  const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
  const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error("OneSignal credentials missing");
    return false;
  }

  // Check if user has push enabled
  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("onesignal_subscription_id, onesignal_player_id, enabled")
    .eq("user_id", payload.userId)
    .eq("enabled", true)
    .single();

  if (!sub) {
    console.log(`No push subscription for user ${payload.userId}`);
    return false;
  }

  const priority = payload.prioridade === "CRITICO" ? 10 : payload.prioridade === "URGENTE" ? 8 : 5;

  // Use external_id targeting (set via OneSignal.login(userId) on client)
  // This is the most reliable method for OneSignal v16 SDK
  const body: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: payload.titulo },
    contents: { en: payload.mensagem },
    priority,
    target_channel: "push",
    include_aliases: { external_id: [payload.userId] },
    url: "/admin",
  };

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    console.log("OneSignal response:", JSON.stringify(result));
    
    // If external_id fails, fallback to subscription_id or player_id
    if (!res.ok && (sub.onesignal_subscription_id || sub.onesignal_player_id)) {
      console.log("Falling back to direct subscription/player targeting");
      const fallbackBody: Record<string, unknown> = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: payload.titulo },
        contents: { en: payload.mensagem },
        priority,
        url: "/admin",
      };
      
      if (sub.onesignal_subscription_id) {
        fallbackBody.include_subscription_ids = [sub.onesignal_subscription_id];
      } else {
        fallbackBody.include_player_ids = [sub.onesignal_player_id];
      }
      
      const fallbackRes = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(fallbackBody),
      });
      const fallbackResult = await fallbackRes.json();
      console.log("OneSignal fallback response:", JSON.stringify(fallbackResult));
      return fallbackRes.ok;
    }
    
    return res.ok;
  } catch (err) {
    console.error("OneSignal send error:", err);
    return false;
  }
}

// ==================== 8. LOG ====================

async function salvarLog(supabase: any, payload: NotificationPayload, hash: string) {
  await supabase.from("notification_logs").insert({
    user_id: payload.userId,
    alert_type: payload.alertType,
    priority: payload.prioridade,
    title: payload.titulo,
    message: payload.mensagem,
    hash,
  });
}

// ==================== ENGINE PRINCIPAL ====================

async function executarRotina(supabase: any, periodo: string) {
  console.log(`[notification-engine] Executando rotina: ${periodo}`);

  // 1. Detectar
  const eventos = await detectarEventos(supabase, periodo);
  console.log(`[notification-engine] ${eventos.length} eventos detectados`);

  if (eventos.length === 0) return { sent: 0, skipped: 0 };

  // 2. Normalizar
  const normalizados = normalizarEventos(eventos);

  // 3. Agrupar por usuário
  const porUsuario = new Map<string, NormalizedEvent[]>();
  for (const ev of normalizados) {
    const arr = porUsuario.get(ev.userId) || [];
    arr.push(ev);
    porUsuario.set(ev.userId, arr);
  }

  let sent = 0;
  let skipped = 0;

  // 4. Processar cada usuário
  for (const [userId, userEvents] of porUsuario) {
    // Gerar mensagem agrupada
    const { titulo, mensagem, alertType } = gerarMensagem(userEvents);
    if (!titulo) { skipped++; continue; }

    // Definir prioridade (maior entre todos os eventos)
    const prioridades = userEvents.map((e) => definirPrioridade(e.tipo));
    const prioridade = prioridades.includes("CRITICO") ? "CRITICO" :
                       prioridades.includes("URGENTE") ? "URGENTE" : "NORMAL";

    // Deduplicação
    const hash = generateHash(userId, titulo, mensagem);
    if (await hashJaExiste(supabase, hash)) {
      console.log(`[notification-engine] Duplicado: ${hash}`);
      skipped++;
      continue;
    }

    // Anti-spam
    if (!(await podeEnviar(supabase, userId, alertType))) {
      console.log(`[notification-engine] Anti-spam bloqueou: ${userId} / ${alertType}`);
      skipped++;
      continue;
    }

    // Enviar
    const payload: NotificationPayload = { userId, titulo, mensagem, prioridade, alertType };
    const ok = await enviarPush(payload, supabase);

    // Salvar log apenas quando enviou com sucesso
    if (ok) await salvarLog(supabase, payload, hash);

    if (ok) sent++;
    else skipped++;
  }

  console.log(`[notification-engine] Concluído: ${sent} enviadas, ${skipped} ignoradas`);
  return { sent, skipped };
}

// ==================== HTTP HANDLER ====================

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

    const { periodo = "manual", tipo, userId, leadCount } = await req.json().catch(() => ({}));

    // Modo manual: enviar notificação avulsa (ex: novo lead em tempo real)
    if (tipo === "lead_recebido" && userId) {
      const count = leadCount || 1;
      const payload: NotificationPayload = {
        userId,
        titulo: count > 1 ? `📩 ${count} novos leads recebidos!` : "📩 Novo lead recebido!",
        mensagem: count > 1
          ? `Você recebeu ${count} novos leads. Acesse o painel para visualizar e aceitar.`
          : "Você recebeu um novo lead. Acesse o painel para visualizar e aceitar.",
        prioridade: "URGENTE",
        alertType: "lead_recebido",
      };

      const hash = generateHash(userId, payload.titulo, payload.mensagem);
      if (await hashJaExiste(supabaseAdmin, hash)) {
        return new Response(JSON.stringify({ ok: true, action: "deduplicated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await podeEnviar(supabaseAdmin, userId, "lead_recebido"))) {
        return new Response(JSON.stringify({ ok: true, action: "throttled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sent = await enviarPush(payload, supabaseAdmin);
      if (sent) await salvarLog(supabaseAdmin, payload, hash);

      return new Response(JSON.stringify({ ok: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Modo cron: rotina completa
    const result = await executarRotina(supabaseAdmin, periodo);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notification-engine] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
