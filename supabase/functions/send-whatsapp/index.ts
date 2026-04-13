import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ZAPI_INSTANCE_ID = (Deno.env.get("ZAPI_INSTANCE_ID") ?? "").trim();
const ZAPI_TOKEN = (Deno.env.get("ZAPI_TOKEN") ?? "").trim();
const ZAPI_CLIENT_TOKEN = (Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "").trim();

/** Validate Brazilian phone: 10-11 digits (with or without country code 55) */
function validatePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip country code if present
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (!/^\d{10,11}$/.test(local)) {
    throw new Error("Número de telefone inválido");
  }
  return "55" + local;
}

/** Whitelist domains allowed for PDF URLs sent to Z-API */
const ALLOWED_PDF_DOMAINS = [
  "szaepmecxdhxduqbikqm.supabase.co",
  "szaepmecxdhxduqbikqm.supabase.in",
];

function validatePdfUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new Error("URL do PDF deve usar HTTPS");
    }
    if (!ALLOWED_PDF_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith("." + d))) {
      throw new Error("Domínio do PDF não permitido");
    }
  } catch (e) {
    if (e instanceof TypeError) throw new Error("URL do PDF inválida");
    throw e;
  }
}

/** Sanitize error message to avoid leaking internal details */
function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Allow known user-facing messages through
    const safeMessages = [
      "Número de telefone inválido",
      "URL do PDF deve usar HTTPS",
      "Domínio do PDF não permitido",
      "URL do PDF inválida",
      "Campos obrigatórios",
      "Muitas tentativas",
      "Unauthorized",
      "Z-API não configurada",
      "Tipo de mensagem desconhecido",
    ];
    if (safeMessages.some((s) => msg.includes(s))) return msg;
  }
  return "Erro ao enviar mensagem. Tente novamente.";
}

async function sendText(phone: string, message: string) {
  const formattedPhone = validatePhone(phone);

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const body = {
    phone: formattedPhone,
    message: message,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return json;
}

async function sendDocument(
  phone: string,
  documentUrl: string,
  filename: string,
  caption: string
) {
  const formattedPhone = validatePhone(phone);
  validatePdfUrl(documentUrl);

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
      caption: caption,
    }),
  });

  const json = await res.json();
  return json;
}

// Types that can be called without user auth (public simulator)
const PUBLIC_TYPES = ["enviar_proposta"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // Parse body para verificar tipo antes da auth
    const { type, data } = await req.json();
    const isPublicType = PUBLIC_TYPES.includes(type);

    if (isPublicType) {
      // Rate limit chamadas públicas por IP
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
    } else {
      // Tipos não-públicos exigem autenticação
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Unauthorized");
      }

      const token = authHeader.replace("Bearer ", "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const isServiceRole = token === serviceRoleKey;

      if (!isServiceRole) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { data: userData, error } = await supabase.auth.getUser(token);
        if (error || !userData?.user) throw new Error("Unauthorized");
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
        // Validate required fields
        if (!data.customerPhone || !data.customerName || !data.storeName || !data.pdfUrl) {
          throw new Error("Campos obrigatórios: customerPhone, customerName, storeName, pdfUrl");
        }

        // Send intro text first
        await sendText(
          data.customerPhone,
          `🏊 *Proposta de Piscina - ${data.storeName}*\n\n` +
          `Olá, ${data.customerName}! 👋\n\n` +
          `Segue em anexo sua proposta comercial de piscina.\n\n` +
          `Qualquer dúvida, estamos à disposição!\n\n` +
          `_${data.storeName} · via SimulaPool_`
        );

        // Then send the PDF document
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
    console.error("[SEND-WHATSAPP] Error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
