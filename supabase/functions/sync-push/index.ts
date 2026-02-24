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

// Helper function to trigger appointment notifications
async function triggerNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  appointmentId: string,
  businessId: string,
  eventType: "created" | "updated" | "cancelled"
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-appointment-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ 
        appointment_id: appointmentId, 
        business_id: businessId, 
        event_type: eventType 
      }),
    });
    
    if (!response.ok) {
      console.error(`Notification trigger failed for ${eventType}:`, await response.text());
    } else {
      console.log(`Notification triggered for ${eventType}:`, appointmentId);
    }
  } catch (e) {
    console.error(`Notification trigger error for ${eventType}:`, e);
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const supabaseUser = createClient(
      supabaseUrl,
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
      .in("role", ["owner", "admin"])
      .limit(1)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not a business admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const businessId = membership.business_id;
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

          // Check for slot conflict
          const { data: conflicting } = await supabaseAdmin
            .from("appointments")
            .select("id")
            .eq("business_id", businessId)
            .eq("employee_id", p.employee_id || "")
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
                employee_id: p.employee_id || null,
                service_id: p.service_id || null,
                start_at: p.start_at,
                end_at: p.end_at,
                status: p.status || "confirmed",
              },
              { onConflict: "id" }
            );

            // Trigger notification for new appointment
            await triggerNotification(
              supabaseUrl,
              serviceRoleKey,
              p.id,
              businessId,
              "created"
            );
          }
        } else if (action.type === "APPOINTMENT_UPDATE") {
          const p = action.payload;
          const updateData: any = {};
          if (p.start_at) updateData.start_at = p.start_at;
          if (p.end_at) updateData.end_at = p.end_at;
          if (p.status) updateData.status = p.status;

          await supabaseAdmin
            .from("appointments")
            .update(updateData)
            .eq("id", p.id)
            .eq("business_id", businessId);

          // Trigger notification for updated appointment
          await triggerNotification(
            supabaseUrl,
            serviceRoleKey,
            p.id,
            businessId,
            "updated"
          );
        } else if (action.type === "APPOINTMENT_CANCEL") {
          await supabaseAdmin
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("id", action.payload.id)
            .eq("business_id", businessId);

          // Trigger notification for cancelled appointment
          await triggerNotification(
            supabaseUrl,
            serviceRoleKey,
            action.payload.id,
            businessId,
            "cancelled"
          );
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
