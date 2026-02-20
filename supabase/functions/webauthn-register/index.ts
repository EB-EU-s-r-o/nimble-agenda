import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "challenge") {
      // Generate registration challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const challengeB64 = btoa(String.fromCharCode(...challenge));

      // Get existing credentials to exclude
      const { data: existing } = await supabase
        .from("passkeys")
        .select("credential_id")
        .eq("profile_id", user.id);

      return new Response(
        JSON.stringify({
          challenge: challengeB64,
          rp: {
            name: "Papi Hair Design",
            id: new URL(req.headers.get("origin") || "https://nimble-agenda.lovable.app").hostname,
          },
          user: {
            id: user.id,
            name: user.email || user.id,
            displayName: user.user_metadata?.full_name || user.email || "User",
          },
          excludeCredentials: (existing || []).map((c) => ({
            id: c.credential_id,
            type: "public-key",
          })),
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          timeout: 60000,
          attestation: "none",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "required",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      const { credentialId, publicKey, deviceName } = await req.json().catch(() => ({}));

      // Validate inputs
      if (!credentialId || typeof credentialId !== "string" || credentialId.length > 500) {
        return new Response(JSON.stringify({ error: "Invalid credential ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!publicKey || typeof publicKey !== "string" || publicKey.length > 2000) {
        return new Response(JSON.stringify({ error: "Invalid public key" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeName = deviceName
        ? String(deviceName).slice(0, 100).replace(/[<>"'&]/g, "")
        : "Passkey";

      const { error: insertError } = await supabase.from("passkeys").insert({
        profile_id: user.id,
        credential_id: credentialId,
        public_key: publicKey,
        device_name: safeName,
      });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.code === "23505" ? "Passkey already registered" : "Failed to save passkey" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
