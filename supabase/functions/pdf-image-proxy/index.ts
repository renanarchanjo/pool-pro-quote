import { serve } from "https://deno.land/std@0.190.0/http/server.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "Content-Type, Cache-Control",
};

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
  "::1",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response(JSON.stringify({ error: "url é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = new URL(target);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block internal/private hosts (SSRF protection)
    if (
      BLOCKED_HOSTS.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith(".internal") || parsed.hostname.endsWith(".local")
      )
    ) {
      return new Response(JSON.stringify({ error: "URL não permitida" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow Supabase Storage domains
    if (!parsed.hostname.endsWith(".supabase.co") && !parsed.hostname.endsWith(".supabase.in")) {
      return new Response(JSON.stringify({ error: "Domínio não permitido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Lovable PDF Image Proxy",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Falha ao baixar imagem (${upstream.status})` }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return new Response(JSON.stringify({ error: "O recurso informado não é uma imagem" }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        Vary: "Origin",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
