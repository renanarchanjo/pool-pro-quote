import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const ZAPI_INSTANCE_ID = (Deno.env.get("ZAPI_INSTANCE_ID") ?? "").trim();
const ZAPI_TOKEN = (Deno.env.get("ZAPI_TOKEN") ?? "").trim();
const ZAPI_CLIENT_TOKEN = (Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "").trim();

async function sendText(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("55") ? digits : "55" + digits;
  console.log("Enviando para:", formattedPhone);

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const body = { phone: formattedPhone, message };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  console.log("Z-API response:", JSON.stringify(json));
  return json;
}

async function sendDocument(
  phone: string,
  documentUrl: string,
  filename: string,
  caption: string
) {
  const digits = phone.replace(/\D/g, "");
  const formattedPhone = digits.startsWith("55") ? digits : "55" + digits;

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-document/pdf`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({
      phone: formattedPhone,
      document: documentUrl,
      fileName: filename,
      caption,
    }),
  });

  const json = await res.json();
  console.log("Z-API document response:", JSON.stringify(json));
  return json;
}

const PUBLIC_TYPES = ["enviar_proposta"];

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { type, data } = await req.json();
    const isPublicType = PUBLIC_TYPES.includes(type);

    if (isPublicType) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const { allowed } = await checkRateLimit(supabaseAdmin, clientIp, "send-whatsapp-public", 5, 60);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        });
      }
    }

    if (!isPublicType) {
      if (!authHeader) throw new Error("Unauthorized");

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "NOPE");
      if (!isServiceRole) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error("Unauthorized");
      }
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      throw new Error("Z-API não configurada (INSTANCE_ID ou TOKEN ausente)");
    }

    let result;

    switch (type) {
      case "boas_vindas": {
        result = await sendText(
          data.phone,
          `🎉 *Bem-vindo ao SimulaPool, ${data.name}!*\n\n` +
          `Sua loja *${data.storeName}* foi criada com sucesso.\n\n` +
          `Acesse seu painel em:\nhttps://www.simulapool.com/admin\n\n` +
          `Qualquer dúvida, estamos aqui! 💬`
        );
        break;
      }

      case "novo_lead": {
        result = await sendText(
          data.phone,
          `🔔 *Novo lead recebido!*\n\n` +
          `👤 *Cliente:* ${data.customerName}\n` +
          `📍 *Cidade:* ${data.customerCity}\n` +
          `📱 *WhatsApp:* ${data.customerWhatsapp}\n` +
          `🏊 *Modelo:* ${data.modelName || "Não especificado"}\n\n` +
          `Acesse o painel para mais detalhes:\nhttps://www.simulapool.com/admin`
        );
        break;
      }

      case "proposta_cliente": {
        result = await sendText(
          data.phone,
          `🏊 *Sua proposta de piscina está pronta!*\n\n` +
          `Olá, ${data.customerName}!\n\n` +
          `A loja *${data.storeName}* preparou uma proposta especial para você.\n\n` +
          `💰 *Valor total:* ${data.totalPrice}\n\n` +
          `Acesse sua proposta completa:\n${data.proposalUrl || "https://www.simulapool.com"}\n\n` +
          `_SimulaPool · Simulador de Piscinas de Fibra_`
        );
        break;
      }

      case "enviar_proposta": {
        if (!data.customerPhone || !data.customerName || !data.storeName || !data.pdfUrl) {
          throw new Error("Campos obrigatórios: customerPhone, customerName, storeName, pdfUrl");
        }

        await sendText(
          data.customerPhone,
          `🏊 *Proposta de Piscina - ${data.storeName}*\n\n` +
          `Olá, ${data.customerName}! 👋\n\n` +
          `Segue em anexo sua proposta comercial de piscina.\n\n` +
          `Qualquer dúvida, estamos à disposição!\n\n` +
          `_${data.storeName} · via SimulaPool_`
        );

        result = await sendDocument(
          data.customerPhone,
          data.pdfUrl,
          `Proposta-${data.customerName.replace(/\s+/g, "-")}.pdf`,
          `📄 Proposta comercial — ${data.storeName}`
        );
        break;
      }

      case "enviar_proposta_pdf": {
        result = await sendDocument(
          data.phone,
          data.pdfUrl,
          data.filename || "proposta-simulapool.pdf",
          `📄 *Proposta comercial - ${data.customerName}*\n` +
          `Loja: ${data.storeName}\n` +
          `Valor: ${data.totalPrice}`
        );
        break;
      }

      case "lembrete_followup": {
        result = await sendText(
          data.phone,
          `👋 *Olá, ${data.customerName}!*\n\n` +
          `Notamos que você simulou uma piscina conosco recentemente.\n\n` +
          `Gostaria de tirar alguma dúvida ou agendar uma visita?\n\n` +
          `Estamos à disposição! 😊\n\n` +
          `_${data.storeName} · via SimulaPool_`
        );
        break;
      }

      case "texto_livre": {
        result = await sendText(data.phone, data.message);
        break;
      }

      default:
        throw new Error(`Tipo de mensagem desconhecido: ${type}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-WHATSAPP] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
