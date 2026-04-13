const ALLOWED_ORIGINS = [
  "https://www.simulapool.com",
  "https://simulapool.com",
];

export function getCorsHeaders(requestOrigin: string | null) {
  const isLovablePreview =
    requestOrigin?.endsWith(".lovable.app") ||
    requestOrigin?.endsWith(".lovableproject.com");
  const isAllowed =
    requestOrigin &&
    (ALLOWED_ORIGINS.includes(requestOrigin) || isLovablePreview);

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Backwards-compatible static export for functions that don't need dynamic origin */
export const corsHeaders = getCorsHeaders(null);
