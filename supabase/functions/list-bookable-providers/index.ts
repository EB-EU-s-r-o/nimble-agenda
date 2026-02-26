import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { business_id, service_id } = await req.json();
    if (!business_id) {
      return new Response(JSON.stringify({ error: "Missing business_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const query = supabase
      .from("employees")
      .select("id, display_name, email, phone, photo_url, business_id, is_active")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .eq("is_bookable", true)
      .eq("can_receive_service_bookings", true)
      .order("display_name", { ascending: true });

    const { data: employees, error } = await query;
    if (error) throw error;

    if (!service_id) {
      return new Response(JSON.stringify({ providers: employees ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: mapData, error: mapErr } = await supabase
      .from("employee_services")
      .select("employee_id")
      .eq("service_id", service_id);

    if (mapErr) throw mapErr;

    const allowed = new Set((mapData ?? []).map((r: { employee_id: string }) => r.employee_id));
    const filtered = (employees ?? []).filter((e) => allowed.size === 0 || allowed.has(e.id));

    return new Response(JSON.stringify({ providers: filtered }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
