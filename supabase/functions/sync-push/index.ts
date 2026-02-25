import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OfflineAction {
  type: "APPOINTMENT_CREATE" | "APPOINTMENT_UPDATE" | "APPOINTMENT_CANCEL";
  payload: any;
  idempotency_key: string;
  created_at: string;
}

Deno.serve(async (req) => {
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
    const actions: OfflineAction[] = body.actions || [];

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
        JSON.stringify({ ok: false, error: "Missing business membership" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const businessId = membership.business_id;
    const isEmployee = membership.role === "employee";

    let scopedEmployeeId: string | null = null;
    if (isEmployee) {
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

    const conflicts: Array<{ idempotency_key: string; reason: string; server_suggestion?: any }> = [];
    let applied = 0;

    for (const action of actions) {
      // Dedup check
      const { data: existing } = await supabaseAdmin
        .from("sync_dedup")
        .select("id")
        .eq("idempotency_key", action.idempotency_key)
        .maybeSingle();

      if (existing) {
        applied++;
        continue; // Already processed
      }

      try {
        if (action.type === "APPOINTMENT_CREATE") {
          const p = action.payload;
          const employeeId = isEmployee ? scopedEmployeeId : p.employee_id;

          if (!employeeId) {
            throw new Error("Employee is required for appointment create");
          }

          // Check for slot conflict
          const { data: conflicting } = await supabaseAdmin
            .from("appointments")
            .select("id")
            .eq("business_id", businessId)
            .eq("employee_id", employeeId)
            .neq("status", "cancelled")
            .lt("start_at", p.end_at)
            .gt("end_at", p.start_at)
            .limit(1);

          if (conflicting && conflicting.length > 0) {
            conflicts.push({
              idempotency_key: action.idempotency_key,
              reason: "Slot already occupied",
            });
            continue;
          }

          // Find or create walk-in customer
          const { data: customer } = await supabaseAdmin
            .from("customers")
            .upsert(
              {
                business_id: businessId,
                full_name: p.customer_name || "Walk-in",
                email: `walkin-${p.id}@internal`,
                phone: p.customer_phone || null,
              },
              { onConflict: "business_id,email" }
            )
            .select()
            .single();

          if (customer) {
            await supabaseAdmin.from("appointments").upsert(
              {
                id: p.id,
                business_id: businessId,
                customer_id: customer.id,
                employee_id: employeeId,
                service_id: p.service_id || null,
                start_at: p.start_at,
                end_at: p.end_at,
                status: p.status || "confirmed",
              },
              { onConflict: "id" }
            );
          }
        } else if (action.type === "APPOINTMENT_UPDATE") {
          const p = action.payload;
          const updateData: any = {};
          if (p.start_at) updateData.start_at = p.start_at;
          if (p.end_at) updateData.end_at = p.end_at;
          if (p.status) updateData.status = p.status;

          let updateQuery = supabaseAdmin
            .from("appointments")
            .update(updateData)
            .eq("id", p.id)
            .eq("business_id", businessId);

          if (scopedEmployeeId) {
            updateQuery = updateQuery.eq("employee_id", scopedEmployeeId);
          }

          await updateQuery;
        } else if (action.type === "APPOINTMENT_CANCEL") {
          let cancelQuery = supabaseAdmin
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("id", action.payload.id)
            .eq("business_id", businessId);

          if (scopedEmployeeId) {
            cancelQuery = cancelQuery.eq("employee_id", scopedEmployeeId);
          }

          await cancelQuery;
        }

        // Record dedup
        await supabaseAdmin.from("sync_dedup").insert({
          idempotency_key: action.idempotency_key,
          business_id: businessId,
          action_type: action.type,
        });

        applied++;
      } catch (e: any) {
        conflicts.push({
          idempotency_key: action.idempotency_key,
          reason: e?.message || "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, applied, conflicts: conflicts.length ? conflicts : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
