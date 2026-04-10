import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("ALLOWED_ORIGIN") ?? "https://www.simulapool.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "SimulaPool <noreply@simulapool.com>";

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Unauthorized");

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const { type, data } = await req.json();

    let result;

    switch (type) {

      case "boas_vindas": {
        result = await sendEmail(
          data.email,
          "Bem-vindo ao SimulaPool! 🎉",
          `
          <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:linear-gradient(135deg,#0F172A,#1e293b);padding:32px 24px;text-align:center">
              <h1 style="color:#38bdf8;margin:0;font-size:28px">🏊 SimulaPool</h1>
              <p style="color:#94a3b8;margin:8px 0 0;font-size:14px">Simulador de Piscinas de Fibra</p>
            </div>
            <div style="padding:32px 24px">
              <h2 style="color:#0f172a;margin:0 0 16px">Bem-vindo, ${data.name}!</h2>
              <p style="color:#475569;line-height:1.6;margin:0 0 24px">
                Sua loja <strong>${data.storeName}</strong> foi criada com sucesso.
                Agora você pode começar a criar simulações e receber leads qualificados.
              </p>
              <a href="https://www.simulapool.com/admin" style="display:inline-block;background:#38bdf8;color:#0f172a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">
                Acessar meu painel →
              </a>
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center">
              <p style="color:#94a3b8;margin:0;font-size:12px">SimulaPool · Simulador de Piscinas de Fibra</p>
            </div>
          </div>
          `
        );
        break;
      }

      case "novo_lead": {
        result = await sendEmail(
          data.email,
          "🔔 Novo lead recebido no SimulaPool",
          `
          <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:linear-gradient(135deg,#0F172A,#1e293b);padding:24px;text-align:center">
              <h1 style="color:#38bdf8;margin:0;font-size:22px">🔔 Novo lead recebido!</h1>
            </div>
            <div style="padding:32px 24px">
              <p style="color:#475569;margin:0 0 16px">Olá, <strong>${data.storeName}</strong>!</p>
              <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin:0 0 24px">
                <p style="margin:0 0 8px;color:#0f172a"><strong>Cliente:</strong> ${data.customerName}</p>
                <p style="margin:0 0 8px;color:#0f172a"><strong>Cidade:</strong> ${data.customerCity}</p>
                <p style="margin:0 0 8px;color:#0f172a"><strong>WhatsApp:</strong> ${data.customerWhatsapp}</p>
                <p style="margin:0;color:#0f172a"><strong>Modelo:</strong> ${data.modelName || "Não especificado"}</p>
              </div>
              <a href="https://www.simulapool.com/admin" style="display:inline-block;background:#38bdf8;color:#0f172a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">
                Ver lead no painel →
              </a>
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center">
              <p style="color:#94a3b8;margin:0;font-size:12px">SimulaPool · Simulador de Piscinas de Fibra</p>
            </div>
          </div>
          `
        );
        break;
      }

      case "proposta_enviada": {
        result = await sendEmail(
          data.customerEmail,
          "Sua proposta de piscina está pronta! 🏊",
          `
          <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:linear-gradient(135deg,#0F172A,#1e293b);padding:32px 24px;text-align:center">
              <h1 style="color:#38bdf8;margin:0;font-size:28px">🏊 SimulaPool</h1>
              <p style="color:#94a3b8;margin:8px 0 0">Sua proposta está pronta!</p>
            </div>
            <div style="padding:32px 24px">
              <p style="color:#475569;margin:0 0 16px">Olá, <strong>${data.customerName}</strong>!</p>
              <p style="color:#475569;line-height:1.6;margin:0 0 24px">
                A loja <strong>${data.storeName}</strong> preparou uma proposta especial para você.
              </p>
              <div style="background:#f0f9ff;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
                <p style="color:#64748b;margin:0 0 4px;font-size:14px">Valor total</p>
                <p style="color:#0f172a;margin:0;font-size:32px;font-weight:700">${data.totalPrice}</p>
              </div>
              <a href="${data.proposalUrl || 'https://www.simulapool.com'}" style="display:inline-block;background:#38bdf8;color:#0f172a;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">
                Ver proposta completa →
              </a>
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center">
              <p style="color:#94a3b8;margin:0;font-size:12px">SimulaPool · Simulador de Piscinas de Fibra</p>
            </div>
          </div>
          `
        );
        break;
      }

      case "senha_resetada": {
        result = await sendEmail(
          data.email,
          "Confirmação de alteração de senha",
          `
          <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="background:linear-gradient(135deg,#0F172A,#1e293b);padding:24px;text-align:center">
              <h1 style="color:#38bdf8;margin:0;font-size:22px">🔒 Senha Alterada</h1>
            </div>
            <div style="padding:32px 24px">
              <p style="color:#475569;line-height:1.6;margin:0 0 16px">
                Olá, <strong>${data.name}</strong>! Sua senha foi alterada com sucesso.
              </p>
              <p style="color:#475569;line-height:1.6;margin:0">
                Se você não fez essa alteração, entre em contato imediatamente pelo WhatsApp ou email.
              </p>
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center">
              <p style="color:#94a3b8;margin:0;font-size:12px">SimulaPool · Simulador de Piscinas de Fibra</p>
            </div>
          </div>
          `
        );
        break;
      }

      default:
        throw new Error(`Tipo de email desconhecido: ${type}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-EMAIL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
