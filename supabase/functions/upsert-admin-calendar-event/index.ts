import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = new Set(["private_note", "blocked_time", "internal_event", "admin_booking_note"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { id, business_id, resource_id, start_at, end_at, type, title, note, visibility } = await req.json();

    if (!business_id || !resource_id || !start_at || !end_at || !type || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!ALLOWED_TYPES.has(type)) {
      return new Response(JSON.stringify({ error: "Unsupported admin event type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("business_id", business_id)
      .eq("profile_id", userData.user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      business_id,
      resource_id,
      start_at,
      end_at,
      type,
      title,
      note: note ?? null,
      visibility: visibility ?? "private",
      created_by_profile_id: userData.user.id,
    };

    const table = (supabase as any).from("calendar_events");
    const query = id ? table.update(payload).eq("id", id) : table.insert(payload);
    const { data, error } = await query.select("*").single();

    if (error) throw error;

    return new Response(JSON.stringify({ event: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
