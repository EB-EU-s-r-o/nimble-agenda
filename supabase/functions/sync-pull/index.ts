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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const days = body.days || 2;

    // Get user's business
    const { data: membership } = await supabaseAdmin
      .from("memberships")
      .select("business_id, role")
      .eq("profile_id", userId)
      .in("role", ["owner", "admin", "employee"])
      .limit(1)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ ok: false, error: "No business membership" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const businessId = membership.business_id;

    let scopedEmployeeId: string | null = null;
    if (membership.role === "employee") {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("id, is_active")
        .eq("business_id", businessId)
        .eq("profile_id", userId)
        .maybeSingle();

      if (!employee?.id || employee.is_active === false) {
        return new Response(
          JSON.stringify({ ok: false, error: "Employee account is not linked or is deactivated" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      scopedEmployeeId = employee.id;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000);

    let appointmentsQuery = supabaseAdmin
      .from("appointments")
      .select("id, start_at, end_at, status, customers(full_name, phone), employees(display_name, id), services(name_sk, id)")
      .eq("business_id", businessId)
      .gte("start_at", startOfDay.toISOString())
      .lt("start_at", endDate.toISOString())
      .neq("status", "cancelled");

    if (scopedEmployeeId) {
      appointmentsQuery = appointmentsQuery.eq("employee_id", scopedEmployeeId);
    }

    const { data: appointments, error } = await appointmentsQuery.order("start_at");

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map to OfflineAppointment format
    const mapped = (appointments || []).map((a: any) => ({
      id: a.id,
      start_at: a.start_at,
      end_at: a.end_at,
      customer_name: a.customers?.full_name || "?",
      customer_phone: a.customers?.phone || undefined,
      employee_id: a.employees?.id || undefined,
      employee_name: a.employees?.display_name || undefined,
      service_id: a.services?.id || undefined,
      service_name: a.services?.name_sk || undefined,
      status: a.status,
      updated_at: new Date().toISOString(),
      synced: true,
    }));

    return new Response(
      JSON.stringify({ ok: true, appointments: mapped, days }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
