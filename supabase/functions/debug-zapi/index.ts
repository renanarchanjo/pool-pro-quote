import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
  const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
  const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN ?? "",
    },
    body: JSON.stringify({
      phone: "5511920905114",
      message: "Teste debug SimulaPool",
    }),
  });

  const json = await res.json();

  return new Response(JSON.stringify({
    instance_id: ZAPI_INSTANCE_ID ? "OK" : "VAZIO",
    token: ZAPI_TOKEN ? "OK" : "VAZIO",
    client_token: ZAPI_CLIENT_TOKEN ? "OK" : "VAZIO",
    zapi_response: json,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
