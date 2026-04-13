import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Rate limit: 10 uploads per minute per IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed } = await checkRateLimit(
      supabase,
      clientIp,
      "upload-proposal-pdf",
      10,
      60,
    );
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        },
      );
    }

    const { proposalId, pdfBase64 } = await req.json();

    if (
      !proposalId ||
      typeof proposalId !== "string" ||
      !pdfBase64 ||
      typeof pdfBase64 !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "proposalId e pdfBase64 são obrigatórios" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate proposalId format (UUID)
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        proposalId,
      )
    ) {
      return new Response(
        JSON.stringify({ error: "proposalId inválido" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Decode base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `proposal-${proposalId}.pdf`;

    // Upload using service role key — bypasses all RLS policies
    const { error: uploadError } = await supabase.storage
      .from("proposals")
      .upload(fileName, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[UPLOAD-PDF] Storage error:", uploadError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar PDF" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Generate signed URL (48h TTL)
    const { data: signedData, error: signError } = await supabase.storage
      .from("proposals")
      .createSignedUrl(fileName, 172800);

    if (signError || !signedData?.signedUrl) {
      console.error("[UPLOAD-PDF] Signed URL error:", signError?.message);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar URL do PDF" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedData.signedUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      "[UPLOAD-PDF] Error:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(
      JSON.stringify({ error: "Erro ao processar upload do PDF" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
