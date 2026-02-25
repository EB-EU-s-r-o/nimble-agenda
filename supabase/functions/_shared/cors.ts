const DEFAULT_ALLOWED_ORIGINS = [
  "https://booking.papihairdesign.sk",
  "http://localhost:8080",
  "http://localhost:5173",
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const ALLOWED_METHODS = "POST, OPTIONS";

export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("EDGE_ALLOWED_ORIGINS") ?? "";
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

export function isAllowedOrigin(origin: string | null, allowedOrigins = getAllowedOrigins()): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export function buildCorsHeaders(origin: string | null, allowedOrigins = getAllowedOrigins()): HeadersInit {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    Vary: "Origin",
  };
}
