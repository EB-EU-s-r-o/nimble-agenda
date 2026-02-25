import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders, getAllowedOrigins, isAllowedOrigin } from "../_shared/cors.ts";

const allowedOrigins = getAllowedOrigins();

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  if (!isAllowedOrigin(origin, allowedOrigins)) {
    return new Response(JSON.stringify({ error: "CORS origin denied" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user from JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { business_id, host, port, user: smtpUser, from, pass } = await req.json();

    if (!business_id || typeof business_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin of this business
    const { data: isAdmin } = await supabaseAdmin.rpc("is_business_admin", {
      _user_id: user.id,
      _business_id: business_id,
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden – admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    const sanitized: Record<string, unknown> = {
      host: typeof host === "string" ? host.trim().slice(0, 255) : "",
      port: Number(port) || 465,
      user: typeof smtpUser === "string" ? smtpUser.trim().slice(0, 255) : "",
      from: typeof from === "string" ? from.trim().slice(0, 255) : "",
    };

    // If pass is provided and not empty, include it. Otherwise load existing.
    if (typeof pass === "string" && pass.length > 0) {
      sanitized.pass = pass.slice(0, 500);
    } else {
      // Keep existing password
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("smtp_config")
        .eq("id", business_id)
        .single();
      const existing = (biz?.smtp_config as Record<string, unknown>) ?? {};
      sanitized.pass = existing.pass ?? "";
    }

    const { error } = await supabaseAdmin
      .from("businesses")
      .update({ smtp_config: sanitized })
      .eq("id", business_id);

    if (error) {
      console.error("SMTP save error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-smtp-config error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

