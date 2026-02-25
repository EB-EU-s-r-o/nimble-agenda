import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
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
    const { action, credentialId, email } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "challenge") {
      // Generate authentication challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeB64 = btoa(String.fromCharCode(...challenge));

      // If email provided, get that user's credentials
      let allowCredentials: { id: string; type: string }[] = [];
      if (email && typeof email === "string") {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email.trim().toLowerCase())
          .single();

        if (profile) {
          const { data: creds } = await supabaseAdmin
            .from("passkeys")
            .select("credential_id")
            .eq("profile_id", profile.id);

          allowCredentials = (creds || []).map((c) => ({
            id: c.credential_id,
            type: "public-key",
          }));
        }
      }

      return new Response(
        JSON.stringify({
          challenge: challengeB64,
          rpId: new URL(req.headers.get("origin") || "https://nimble-agenda.lovable.app").hostname,
          timeout: 60000,
          userVerification: "required",
          allowCredentials,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!credentialId || typeof credentialId !== "string") {
        return new Response(JSON.stringify({ error: "Missing credential" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Look up the passkey
      const { data: passkey } = await supabaseAdmin
        .from("passkeys")
        .select("*, profiles!inner(email)")
        .eq("credential_id", credentialId)
        .single();

      if (!passkey) {
        return new Response(JSON.stringify({ error: "Passkey not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update last_used_at and sign_count
      await supabaseAdmin
        .from("passkeys")
        .update({
          last_used_at: new Date().toISOString(),
          sign_count: (passkey.sign_count || 0) + 1,
        })
        .eq("id", passkey.id);

      // Generate a magic link for the user (passwordless sign-in)
      const userEmail = (passkey as { profiles?: { email?: string } }).profiles?.email;
      if (!userEmail) {
        return new Response(JSON.stringify({ error: "No email associated" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use generateLink to create an OTP for sign in
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });

      if (linkError || !linkData) {
        return new Response(JSON.stringify({ error: "Failed to create session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract the token from the link
      const url = new URL(linkData.properties.action_link);
      const token = url.searchParams.get("token");
      const tokenType = url.searchParams.get("type");

      return new Response(
        JSON.stringify({
          success: true,
          email: userEmail,
          token,
          tokenType: tokenType || "magiclink",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
