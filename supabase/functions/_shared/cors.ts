export const ALLOWED_ORIGINS = [
  "https://simulapool.com",
  "https://www.simulapool.com",
];

/**
 * Retorna os headers CORS validando a origin da requisição.
 * Se a origin não for permitida, retorna a origin principal como fallback.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

/**
 * Valida e retorna a origin para URLs de callback (Stripe success/cancel).
 * Retorna apenas origins da whitelist — nunca um domínio arbitrário.
 */
export function getSafeCallbackOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  const referer = req.headers.get("referer") ?? "";
  try {
    const refOrigin = new URL(referer).origin;
    if (ALLOWED_ORIGINS.includes(refOrigin)) return refOrigin;
  } catch { /* invalid referer, ignore */ }
  return ALLOWED_ORIGINS[0];
}

/** Header estático para compatibilidade (usa origin principal) */
export const corsHeaders = getCorsHeaders();
