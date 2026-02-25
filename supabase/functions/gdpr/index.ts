import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type GdprAction = "status" | "export" | "delete";

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

function detectAction(req: Request): GdprAction | null {
  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();
  if (path.endsWith("/status")) return "status";
  if (path.endsWith("/export")) return "export";
  if (path.endsWith("/delete")) return "delete";
  return null;
}

async function getAuthUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.warn("gdpr auth token validation failed", error.message);
    return null;
  }

  return data.user ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const action = detectAction(req);
  if (!action) {
    return json(404, { ok: false, error: { code: "UNKNOWN_ACTION", message: "Use /status, /export or /delete" } });
  }

  const authUser = await getAuthUser(req);
  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (action === "status") {
      if (req.method !== "GET") {
        return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for status" } });
      }

      let requestHistory: Array<Record<string, unknown>> = [];
      if (authUser) {
        const { data } = await serviceSupabase
          .from("gdpr_requests")
          .select("id, request_type, status, source, created_at, updated_at")
          .eq("auth_user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(5);
        requestHistory = data ?? [];
      }

      return json(200, {
        ok: true,
        data: {
          mode: "minimum",
          available_actions: ["status", "export", "delete"],
          requires_identity_for_data_access: true,
          export_flow: "request_acknowledged_async",
          delete_flow: "request_acknowledged_pending_review",
          authenticated: Boolean(authUser),
          request_history: requestHistory,
          contact: {
            email: "privacy@booking.papihairdesign.sk",
          },
        },
      });
    }

    if (req.method !== "POST") {
      return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for this action" } });
    }

    const body = await req.json() as Record<string, unknown>;
    const source = body.source === "app" ? "app" : "web";
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

    let requesterEmailHash: string | null = null;
    if (!authUser) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !EMAIL_RE.test(email)) {
        return json(400, { ok: false, error: { code: "EMAIL_REQUIRED", message: "Public request requires a valid email" } });
      }
      requesterEmailHash = await hashText(email);
    }

    const requestType = action === "export" ? "export" : "delete";
    const status = action === "delete" ? "pending_review" : "accepted";

    const { data, error } = await serviceSupabase
      .from("gdpr_requests")
      .insert({
        request_type: requestType,
        status,
        source,
        auth_user_id: authUser?.id ?? null,
        requester_email_hash: requesterEmailHash,
        metadata,
      })
      .select("id, request_type, status, created_at")
      .single();

    if (error) {
      console.error("gdpr request insert failed", error);
      return json(500, { ok: false, error: { code: "INSERT_FAILED", message: "Could not create GDPR request" } });
    }

    return json(202, {
      ok: true,
      data: {
        ...data,
        mode: "minimum",
        next_step: action === "export"
          ? "Export request accepted and queued for review/fulfilment."
          : "Deletion request accepted for manual review; no immediate destructive delete was performed.",
      },
    });
  } catch (error) {
    console.error("gdpr endpoint unhandled error", error);
    return json(500, { ok: false, error: { code: "UNEXPECTED", message: "Unexpected server error" } });
  }
});
