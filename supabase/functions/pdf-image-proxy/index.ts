import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Lovable PDF Image Proxy",
        "Accept": "image/*,*/*;q=0.8",
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
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});