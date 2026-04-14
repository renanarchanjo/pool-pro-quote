import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const ZAPI_INSTANCE_ID = (Deno.env.get("ZAPI_INSTANCE_ID") ?? "").trim();
const ZAPI_TOKEN = (Deno.env.get("ZAPI_TOKEN") ?? "").trim();
const ZAPI_CLIENT_TOKEN = (Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "").trim();
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const jsonResponse = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
};

async function parseZApiResponse(res: Response, label: string) {
  const text = await res.text();
  let payload: unknown = text;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(`${label} falhou (${res.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }

  return payload;
}

async function sendText(phone: string, message: string) {
  const formattedPhone = normalizePhone(phone);
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone: formattedPhone, message }),
  });

  return parseZApiResponse(res, "Envio de texto para Z-API");
}

async function sendDocument(phone: string, documentUrl: string, filename: string, caption: string) {
  const formattedPhone = normalizePhone(phone);
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

  return parseZApiResponse(res, "Envio de documento para Z-API");
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend storage não configurado");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = await checkRateLimit(supabaseAdmin, clientIp, "send-proposal-whatsapp-public", 5, 60);
    if (!allowed) {
      return jsonResponse({ error: "Muitas tentativas. Aguarde." }, 429, corsHeaders);
    }

    const formData = await req.formData();
    const pdfFile = formData.get("pdf");
    const storeId = String(formData.get("storeId") || "").trim();
    const proposalId = String(formData.get("proposalId") || "").trim();
    const customerPhone = String(formData.get("customerPhone") || "").trim();
    const customerName = String(formData.get("customerName") || "").trim();
    const storeName = String(formData.get("storeName") || "").trim();
    const uploadOnly = ["1", "true", "yes"].includes(
      String(formData.get("uploadOnly") || "")
        .trim()
        .toLowerCase(),
    );

    if (!(pdfFile instanceof File)) {
      throw new Error("Arquivo PDF obrigatório");
    }
    if (!storeId || !proposalId) {
      throw new Error("Campos obrigatórios: storeId, proposalId");
    }
    if (!uploadOnly && (!customerPhone || !customerName || !storeName)) {
      throw new Error("Campos obrigatórios: customerPhone, customerName, storeName");
    }
    if (pdfFile.size === 0) {
      throw new Error("PDF vazio");
    }
    if (pdfFile.size > MAX_PDF_SIZE_BYTES) {
      throw new Error("PDF excede o limite de 10MB");
    }

    console.log("[SEND-PROPOSAL-WHATSAPP] Recebido:", JSON.stringify({
      storeId,
      proposalId,
      uploadOnly,
      customerPhone,
      pdfSize: pdfFile.size,
      pdfType: pdfFile.type,
    }));

    const filePath = `${storeId}/${proposalId}.pdf`;
    const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("proposals")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Falha ao salvar PDF: ${uploadError.message}`);
    }

    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from("proposals")
      .createSignedUrl(filePath, 172800);

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Falha ao assinar PDF: ${signError?.message || "unknown"}`);
    }

    const pdfUrl = signedData.signedUrl;
    console.log("[SEND-PROPOSAL-WHATSAPP] PDF assinado:", pdfUrl.substring(0, 120));

    const pdfCheck = await fetch(pdfUrl, { method: "HEAD" });
    if (!pdfCheck.ok) {
      throw new Error(`PDF inacessível após upload (${pdfCheck.status})`);
    }

    if (uploadOnly) {
      console.log("[SEND-PROPOSAL-WHATSAPP] Upload-only concluído com sucesso");
      return jsonResponse({ success: true, uploadOnly: true, pdfUrl }, 200, corsHeaders);
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
      throw new Error("Z-API não configurada");
    }

    await sendText(
      customerPhone,
      `🏊 *Proposta de Piscina - ${storeName}*\n\n` +
        `Olá, ${customerName}! 👋\n\n` +
        `Segue em anexo sua proposta comercial de piscina.\n\n` +
        `Qualquer dúvida, estamos à disposição!\n\n` +
        `_${storeName} · via SimulaPool_`,
    );

    const result = await sendDocument(
      customerPhone,
      pdfUrl,
      `Proposta-${customerName.replace(/\s+/g, "-")}.pdf`,
      `📄 Proposta comercial — ${storeName}`,
    );

    return jsonResponse({ success: true, pdfUrl, result }, 200, corsHeaders);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-PROPOSAL-WHATSAPP] Error:", msg);
    return jsonResponse({ error: msg }, 400, corsHeaders);
  }
});
