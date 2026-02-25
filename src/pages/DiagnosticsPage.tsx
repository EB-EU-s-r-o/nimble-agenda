import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const DIAGNOSTICS_KEY = "diagnostics";
const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

type TestStatus = "idle" | "loading" | "ok" | "error";

const stripBom = (value: string | undefined) => (value ?? "").replace(/^\uFEFF/, "").trim();

const extractProjectRefFromHost = (host: string | null) => {
  if (!host) return null;
  const [prefix] = host.split(".");
  return prefix || null;
};

export default function DiagnosticsPage() {
  const [searchParams] = useSearchParams();

  const [urlSet, setUrlSet] = useState<boolean | null>(null);
  const [publishableKeySet, setPublishableKeySet] = useState<boolean | null>(null);
  const [supabaseUrlHost, setSupabaseUrlHost] = useState<string | null>(null);

  const [dbStatus, setDbStatus] = useState<TestStatus>("idle");
  const [dbError, setDbError] = useState<string | null>(null);

  const [servicesStatus, setServicesStatus] = useState<TestStatus>("idle");
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [activeServicesCount, setActiveServicesCount] = useState<number | null>(null);

  const [rpcStatus, setRpcStatus] = useState<TestStatus>("idle");
  const [rpcError, setRpcError] = useState<string | null>(null);

  const [authStatus, setAuthStatus] = useState<TestStatus>("idle");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const allowed = import.meta.env.DEV === true || searchParams.get("key") === DIAGNOSTICS_KEY;

  useEffect(() => {
    const rawUrl = stripBom(import.meta.env.VITE_SUPABASE_URL);
    const rawKey = stripBom(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

    setUrlSet(Boolean(rawUrl));
    setPublishableKeySet(Boolean(rawKey));

    if (!rawUrl) {
      setSupabaseUrlHost(null);
      return;
    }

    try {
      const parsedUrl = new URL(rawUrl);
      setSupabaseUrlHost(parsedUrl.hostname);
    } catch {
      setSupabaseUrlHost(rawUrl.slice(0, 80));
    }
  }, []);

  const expectedProjectRef = useMemo(() => {
    const byEnv = stripBom(import.meta.env.VITE_SUPABASE_PROJECT_ID);
    if (byEnv) return byEnv;
    return extractProjectRefFromHost(supabaseUrlHost);
  }, [supabaseUrlHost]);

  const hostProjectRef = useMemo(() => extractProjectRefFromHost(supabaseUrlHost), [supabaseUrlHost]);

  useEffect(() => {
    if (!allowed) return;

    const run = async () => {
      setDbStatus("loading");
      setDbError(null);

      const { error } = await supabase.from("businesses").select("id").limit(1);

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
      setServicesStatus("loading");
      setServicesError(null);
      setActiveServicesCount(null);

      const { count, error } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", DEMO_BUSINESS_ID)
        .eq("is_active", true);

      if (error) {
        setServicesStatus("error");
        setServicesError(error.message ?? "Chyba dotazu");
      } else {
        setServicesStatus("ok");
        setActiveServicesCount(count ?? 0);
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

  const hasHostMismatch = Boolean(expectedProjectRef && hostProjectRef && hostProjectRef !== expectedProjectRef);
  const expectedUrl = expectedProjectRef ? `https://${expectedProjectRef}.supabase.co` : null;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Diagnostika</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Env</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">VITE_SUPABASE_URL: {urlSet === null ? "—" : urlSet ? "Áno" : "Nie"}</p>
            <p className="text-sm text-muted-foreground">VITE_SUPABASE_PUBLISHABLE_KEY: {publishableKeySet === null ? "—" : publishableKeySet ? "Áno" : "Nie"}</p>

            {supabaseUrlHost && (
              <p className="text-sm font-mono break-all">Aktuálny host: {supabaseUrlHost}</p>
            )}

            {expectedProjectRef && (
              <p className="text-sm text-muted-foreground">Očakávaný projekt: {expectedProjectRef}</p>
            )}

            {hasHostMismatch && (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Nesúlad: app ukazuje na iný Supabase projekt. Skontroluj VITE_SUPABASE_URL a VITE_SUPABASE_PUBLISHABLE_KEY.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">DB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {dbStatus === "idle" && <p className="text-sm text-muted-foreground">—</p>}
            {dbStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Načítavam…
              </span>
            )}
            {dbStatus === "ok" && <p className="text-sm text-green-600 dark:text-green-400">OK</p>}
            {dbStatus === "error" && <p className="text-sm text-destructive">Chyba: {dbError ?? "neznáma"}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Služby (demo business)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {servicesStatus === "idle" && <p className="text-sm text-muted-foreground">—</p>}
            {servicesStatus === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Načítavam…
              </span>
            )}
            {servicesStatus === "ok" && (
              <p className="text-sm text-green-600 dark:text-green-400">OK (aktívne služby: {activeServicesCount ?? 0})</p>
            )}
            {servicesStatus === "error" && <p className="text-sm text-destructive">Chyba: {servicesError ?? "neznáma"}</p>}
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
            {rpcStatus === "ok" && <p className="text-sm text-green-600 dark:text-green-400">OK</p>}
            {rpcStatus === "error" && <p className="text-sm text-destructive">Chyba: {rpcError ?? "neznáma"}</p>}
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
            {authStatus === "ok" && <p className="text-sm text-muted-foreground">Session: {hasSession ? "áno" : "nie"}</p>}
            {authStatus === "error" && <p className="text-sm text-destructive">Chyba: {authError ?? "neznáma"}</p>}
          </CardContent>
        </Card>

        {(dbStatus === "error" || servicesStatus === "error" || rpcStatus === "error" || hasHostMismatch || !urlSet || !publishableKeySet) && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rýchly postup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Ak je niečo červené vyššie, najčastejšie ide o env premenné alebo migrácie na inom projekte.</p>
              <p className="font-medium text-foreground">Možnosť 1 (odporúčané):</p>
              <p>
                Vercel → Settings → Environment Variables. Nastav <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code>
                {expectedUrl ? <span> = <code className="rounded bg-muted px-1">{expectedUrl}</code></span> : null}
                {expectedProjectRef ? <span> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> = anon key z projektu <code className="rounded bg-muted px-1">{expectedProjectRef}</code>.</span> : <span> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> = anon key z toho istého projektu.</span>}
              </p>
              <p className="font-medium text-foreground">Možnosť 2:</p>
              <p>
                Spusti migrácie na aktuálny projekt: SQL Editor v Supabase Dashboard (obsah <code className="rounded bg-muted px-1">supabase/migrations/run-all.sql</code>)
                alebo skript <code className="rounded bg-muted px-1">./supabase-db-push-psql.ps1 -ProjectRef &lt;tvoj-project-ref&gt;</code>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
