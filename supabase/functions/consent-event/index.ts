import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConsentAction = "accept" | "reject" | "update" | "withdraw";
type ConsentSubjectType = "anon_user" | "authenticated_user" | "session";
type ConsentSource = "web" | "app";

const ALLOWED_ACTIONS = new Set<ConsentAction>(["accept", "reject", "update", "withdraw"]);
const ALLOWED_SUBJECT_TYPES = new Set<ConsentSubjectType>(["anon_user", "authenticated_user", "session"]);
const ALLOWED_SOURCES = new Set<ConsentSource>(["web", "app"]);
const ALLOWED_CATEGORIES = new Set(["necessary", "analytics", "marketing", "functional", "preferences"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashText(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  return cf || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } });

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action;
    const subjectType = body.subject_type;
    const source = body.source;
    const categoriesRaw = body.categories;

    if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action as ConsentAction)) {
      return json(400, { ok: false, error: { code: "INVALID_ACTION", message: "action must be one of: accept, reject, update, withdraw" } });
    }

    if (typeof subjectType !== "string" || !ALLOWED_SUBJECT_TYPES.has(subjectType as ConsentSubjectType)) {
      return json(400, { ok: false, error: { code: "INVALID_SUBJECT_TYPE", message: "subject_type must be one of: anon_user, authenticated_user, session" } });
    }

    if (typeof source !== "string" || !ALLOWED_SOURCES.has(source as ConsentSource)) {
      return json(400, { ok: false, error: { code: "INVALID_SOURCE", message: "source must be one of: web, app" } });
    }

    if (!Array.isArray(categoriesRaw)) {
      return json(400, { ok: false, error: { code: "INVALID_CATEGORIES", message: "categories must be an array" } });
    }

    const categories = categoriesRaw.filter((v): v is string => typeof v === "string");
    if (categories.length !== categoriesRaw.length || categories.some((c) => !ALLOWED_CATEGORIES.has(c))) {
      return json(400, { ok: false, error: { code: "INVALID_CATEGORIES", message: "categories contains unsupported values" } });
    }

    const businessId = body.business_id;
    if (businessId != null && (typeof businessId !== "string" || !UUID_RE.test(businessId))) {
      return json(400, { ok: false, error: { code: "INVALID_BUSINESS_ID", message: "business_id must be a UUID when provided" } });
    }

    const subjectIdRaw = body.subject_id;
    const subjectId = typeof subjectIdRaw === "string" && subjectIdRaw.trim() !== ""
      ? subjectIdRaw.trim().slice(0, 128)
      : null;

    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

    const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;
    const clientIp = getClientIp(req);
    const ipHash = clientIp ? await hashText(clientIp) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("consent_events")
      .insert({
        business_id: businessId ?? null,
        subject_type: subjectType,
        subject_id: subjectId,
        action,
        categories,
        source,
        user_agent: userAgent,
        ip_hash: ipHash,
        metadata,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("consent-event insert failed", error);
      return json(500, { ok: false, error: { code: "INSERT_FAILED", message: "Failed to persist consent event" } });
    }

    return json(201, { ok: true, data });
  } catch (error) {
    console.error("consent-event unhandled error", error);
    return json(500, { ok: false, error: { code: "UNEXPECTED", message: "Unexpected server error" } });
  }
});
