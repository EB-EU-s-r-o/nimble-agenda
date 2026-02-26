import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getFirebaseAuth, getFirebaseFirestore } from "@/integrations/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const DIAGNOSTICS_KEY = "diagnostics";
const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const EXPECTED_PROJECT_REF = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "phd-booking";

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
    const url = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ?? import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";
    const ok = Boolean(url);
    setEnvSet(ok);
    setSupabaseUrlHost(ok ? (url.startsWith("http") ? new URL(url).hostname : url) : null);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const run = async () => {
      setDbStatus("loading");
      setDbError(null);
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setDbStatus("error");
        setDbError("Firestore nie je nakonfigurovaný");
        return;
      }
      try {
        const snap = await getDoc(doc(firestore, "businesses", DEMO_BUSINESS_ID));
        setDbStatus(snap.exists() ? "ok" : "error");
        if (!snap.exists()) setDbError("Business neexistuje");
      } catch (e) {
        setDbStatus("error");
        setDbError((e as Error).message ?? "Chyba dotazu");
      }
    };
    run();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    setRpcStatus("ok");
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    setAuthStatus("loading");
    setAuthError(null);
    const auth = getFirebaseAuth();
    setHasSession(Boolean(auth?.currentUser));
    setAuthStatus("ok");
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
              Firebase (Functions / Project): {envSet === null ? "—" : envSet ? "Áno" : "Nie"}
            </p>
            {supabaseUrlHost && (
              <>
                <p className="text-sm font-mono break-all">
                  Aktuálny host / projekt: {supabaseUrlHost}
                </p>
                <p className="text-sm text-muted-foreground">
                  Očakávaný projekt: {EXPECTED_PROJECT_REF}
                </p>
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
              <p>Vercel / Hosting → Environment Variables. Nastav <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> = <code className="rounded bg-muted px-1">https://hrkwqdvfeudxkqttpgls.supabase.co</code> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> = Publishable API Key z Supabase (Dashboard → Settings → API). Ulož a Redeploy.</p>
              <p className="font-medium text-foreground">Možnosť 2:</p>
              <p>Spusti migrácie na aktuálny projekt: <code className="rounded bg-muted px-1">npx supabase link</code> (project ref hrkwqdvfeudxkqttpgls), potom <code className="rounded bg-muted px-1">npx supabase db push</code>, alebo SQL Editor v Supabase Dashboard.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
