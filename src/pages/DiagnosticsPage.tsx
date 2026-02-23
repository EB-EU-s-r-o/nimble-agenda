import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const DIAGNOSTICS_KEY = "diagnostics";
const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const EXPECTED_PROJECT_REF = "eudwjgdijylsgcnncxeg";

type TestStatus = "idle" | "loading" | "ok" | "error";

export default function DiagnosticsPage() {
  const [searchParams] = useSearchParams();
  const [envSet, setEnvSet] = useState<boolean | null>(null);
  const [supabaseUrlHost, setSupabaseUrlHost] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<TestStatus>("idle");
  const [dbError, setDbError] = useState<string | null>(null);
  const [rpcStatus, setRpcStatus] = useState<TestStatus>("idle");
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<TestStatus>("idle");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const allowed =
    import.meta.env.DEV === true ||
    searchParams.get("key") === DIAGNOSTICS_KEY;

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const ok = Boolean(url && String(url).trim() !== "");
    setEnvSet(ok);
    if (url) {
      try {
        const u = new URL(url);
        setSupabaseUrlHost(u.hostname);
      } catch {
        setSupabaseUrlHost(String(url).slice(0, 50));
      }
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;

    const run = async () => {
      setDbStatus("loading");
      setDbError(null);
      const { error } = await supabase
        .from("businesses")
        .select("id")
        .limit(1);
      if (error) {
        setDbStatus("error");
        setDbError(error.message ?? "Chyba dotazu");
      } else {
        setDbStatus("ok");
      }
    };
    run();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;

    const run = async () => {
      setRpcStatus("loading");
      setRpcError(null);
      const { error } = await supabase.rpc("rpc_get_public_business_info", {
        _business_id: DEMO_BUSINESS_ID,
      });
      if (error) {
        setRpcStatus("error");
        setRpcError(error.message ?? "Chyba RPC");
      } else {
        setRpcStatus("ok");
      }
    };
    run();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;

    const run = async () => {
      setAuthStatus("loading");
      setAuthError(null);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setAuthStatus("error");
        setAuthError(error.message ?? "Chyba auth");
        setHasSession(false);
      } else {
        setAuthStatus("ok");
        setHasSession(Boolean(data?.session));
      }
    };
    run();
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Diagnostika</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Env</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              VITE_SUPABASE_URL: {envSet === null ? "—" : envSet ? "Áno" : "Nie"}
            </p>
            {supabaseUrlHost && (
              <>
                <p className="text-sm font-mono break-all">
                  Aktuálny host: {supabaseUrlHost}
                </p>
                <p className="text-sm text-muted-foreground">
                  Očakávaný projekt: {EXPECTED_PROJECT_REF}
                </p>
                {!supabaseUrlHost.startsWith(EXPECTED_PROJECT_REF) && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Nesúlad: Vercel env ukazuje na iný Supabase projekt. Nastav VITE_SUPABASE_URL a VITE_SUPABASE_PUBLISHABLE_KEY z projektu {EXPECTED_PROJECT_REF}.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">DB</CardTitle>
          </CardHeader>
          <CardContent>
            {dbStatus === "idle" && <p className="text-sm text-muted-foreground">—</p>}
            {dbStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Načítavam…
              </span>
            )}
            {dbStatus === "ok" && (
              <p className="text-sm text-green-600 dark:text-green-400">OK</p>
            )}
            {dbStatus === "error" && (
              <p className="text-sm text-destructive">
                Chyba: {dbError ?? "neznáma"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">RPC</CardTitle>
          </CardHeader>
          <CardContent>
            {rpcStatus === "idle" && <p className="text-sm text-muted-foreground">—</p>}
            {rpcStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Načítavam…
              </span>
            )}
            {rpcStatus === "ok" && (
              <p className="text-sm text-green-600 dark:text-green-400">OK</p>
            )}
            {rpcStatus === "error" && (
              <p className="text-sm text-destructive">
                Chyba: {rpcError ?? "neznáma"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Auth</CardTitle>
          </CardHeader>
          <CardContent>
            {authStatus === "idle" && <p className="text-sm text-muted-foreground">—</p>}
            {authStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Načítavam…
              </span>
            )}
            {authStatus === "ok" && (
              <p className="text-sm text-muted-foreground">
                Session: {hasSession ? "áno" : "nie"}
              </p>
            )}
            {authStatus === "error" && (
              <p className="text-sm text-destructive">
                Chyba: {authError ?? "neznáma"}
              </p>
            )}
          </CardContent>
        </Card>

        {(dbStatus === "error" || rpcStatus === "error") && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rýchly postup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Tabuľky/RPC chýbajú v projekte, na ktorý ukazuje app.</p>
              <p className="font-medium text-foreground">Možnosť 1 (odporúčané):</p>
              <p>Vercel → Settings → Environment Variables. Nastav <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> = <code className="rounded bg-muted px-1">https://eudwjgdijylsgcnncxeg.supabase.co</code> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> = anon key z Supabase projektu eudwjgdijylsgcnncxeg (Dashboard → Settings → API). Ulož a Redeploy.</p>
              <p className="font-medium text-foreground">Možnosť 2:</p>
              <p>Spusti migrácie na aktuálny projekt: SQL Editor v Supabase Dashboard (skopíruj <code className="rounded bg-muted px-1">supabase/migrations/run-all.sql</code>) alebo <code className="rounded bg-muted px-1">.\supabase-db-push-psql.ps1 -ProjectRef dssdiqojkktzfuwoulbq</code> (ak host je dssdiqojkktzfuwoulbq).</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
