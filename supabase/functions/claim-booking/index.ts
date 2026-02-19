import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný prístup" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný prístup" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Service role client for writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { claim_token } = body;

    if (!claim_token) {
      return new Response(
        JSON.stringify({ error: "Chýba claim token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(claim_token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Find the claim
    const { data: claim, error: claimErr } = await supabase
      .from("booking_claims")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .single();

    if (claimErr || !claim) {
      return new Response(
        JSON.stringify({ error: "Neplatný alebo expirovaný token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(claim.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expiroval" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link customer to user profile
    const { error: updateErr } = await supabase
      .from("customers")
      .update({ profile_id: userId })
      .eq("email", claim.email)
      .eq("business_id", claim.business_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Chyba pri prepojení účtu" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark claim as used
    await supabase
      .from("booking_claims")
      .update({ used_at: new Date().toISOString() })
      .eq("id", claim.id);

    // Create customer membership if not exists
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("business_id", claim.business_id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!existingMembership) {
      await supabase.from("memberships").insert({
        business_id: claim.business_id,
        profile_id: userId,
        role: "customer",
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Účet bol úspešne prepojený" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("claim-booking error:", err);
    return new Response(
      JSON.stringify({ error: "Interná chyba servera" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
