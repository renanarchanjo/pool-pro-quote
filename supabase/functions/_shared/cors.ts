const ALLOWED_ORIGINS = [
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

/** Header estático para compatibilidade (usa origin principal) */
export const corsHeaders = getCorsHeaders();
