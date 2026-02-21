import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
};

const BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

interface AccountResult {
  email: string;
  userId?: string;
  status: "created" | "exists" | "error";
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify seed secret
  const seedSecret = req.headers.get("x-seed-secret");
  const expectedSecret = Deno.env.get("SEED_SECRET");
  if (!seedSecret || seedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: AccountResult[] = [];

  // 1. Create owner account
  const ownerEmail = "owner@papihairdesign.sk";
  const ownerResult = await createAccount(supabaseAdmin, {
    email: ownerEmail,
    password: "PapiDemo2025!",
    fullName: "Majiteľ Salónu",
    role: "admin",
    isCustomer: false,
  });
  results.push(ownerResult);

  // 2. Create demo customer account
  const demoEmail = "demo@papihairdesign.sk";
  const demoResult = await createAccount(supabaseAdmin, {
    email: demoEmail,
    password: "PapiDemo2025!",
    fullName: "Demo Zákazník",
    role: "customer",
    isCustomer: true,
  });
  results.push(demoResult);

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function createAccount(
  supabase: ReturnType<typeof createClient>,
  opts: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    isCustomer: boolean;
  }
): Promise<AccountResult> {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === opts.email);

    if (existing) {
      return { email: opts.email, userId: existing.id, status: "exists" };
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: opts.email,
        password: opts.password,
        email_confirm: true,
        user_metadata: { full_name: opts.fullName },
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    // Profile is created by trigger, but ensure it exists
    await supabase
      .from("profiles")
      .upsert({ id: userId, email: opts.email, full_name: opts.fullName });

    // Add membership
    await supabase.from("memberships").insert({
      profile_id: userId,
      business_id: BUSINESS_ID,
      role: opts.role,
    });

    // If customer, add to customers table
    if (opts.isCustomer) {
      await supabase.from("customers").insert({
        business_id: BUSINESS_ID,
        email: opts.email,
        full_name: opts.fullName,
        profile_id: userId,
      });
    }

    return { email: opts.email, userId, status: "created" };
  } catch (err) {
    return {
      email: opts.email,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
