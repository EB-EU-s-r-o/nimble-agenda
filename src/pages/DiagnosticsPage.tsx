import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { getFirebaseAuth, getFirebaseFirestore } from "@/integrations/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { TestStatus } from "@/lib/diagnosticsHelpers";
import {
  getFirebaseStatusLabel,
  getSupabaseStatusLabel,
  getSummaryCardClassName,
} from "@/lib/diagnosticsHelpers";

const DIAGNOSTICS_KEY = "diagnostics";
const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const EXPECTED_FIREBASE_PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "phd-booking";
const EXPECTED_SUPABASE_PROJECT = "hrkwqdvfeudxkqttpgls";

function StatusIcon({ status }: Readonly<{ status: TestStatus }>) {
  if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  return null;
}

function renderStatusBlock(
  status: TestStatus,
  errorMessage: string | null,
  okContent?: ReactNode
): ReactNode {
  if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "ok") return okContent ?? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "error") return <span className="text-sm text-destructive">{errorMessage ?? "Chyba"}</span>;
  return null;
}

export default function DiagnosticsPage() {
  const [searchParams] = useSearchParams();
  const [firebaseEnv, setFirebaseEnv] = useState<boolean | null>(null);
  const [supabaseEnv, setSupabaseEnv] = useState<boolean | null>(null);
  const [firebaseDbStatus, setFirebaseDbStatus] = useState<TestStatus>("idle");
  const [firebaseDbError, setFirebaseDbError] = useState<string | null>(null);
  const [supabaseDbStatus, setSupabaseDbStatus] = useState<TestStatus>("idle");
  const [supabaseDbError, setSupabaseDbError] = useState<string | null>(null);
  const [supabaseRpcStatus, setSupabaseRpcStatus] = useState<TestStatus>("idle");
  const [supabaseRpcError, setSupabaseRpcError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<TestStatus>("idle");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const allowed =
    import.meta.env.DEV === true ||
    searchParams.get("key") === DIAGNOSTICS_KEY;

  useEffect(() => {
    const fbUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ?? import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";
    setFirebaseEnv(Boolean(fbUrl));
    const sbUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    const sbKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    setSupabaseEnv(Boolean(sbUrl && sbKey));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const run = async () => {
      setFirebaseDbStatus("loading");
      setFirebaseDbError(null);
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setFirebaseDbStatus("error");
        setFirebaseDbError("Firestore nie je nakonfigurovaný");
        return;
      }
      try {
        const snap = await getDoc(doc(firestore, "businesses", DEMO_BUSINESS_ID));
        setFirebaseDbStatus(snap.exists() ? "ok" : "error");
        if (!snap.exists()) setFirebaseDbError("Business neexistuje");
      } catch (e) {
        setFirebaseDbStatus("error");
        setFirebaseDbError((e as Error).message ?? "Chyba dotazu");
      }
    };
    run();
  }, [allowed]);

  useEffect(() => {
    if (!allowed || !supabaseEnv) return;
    const run = async () => {
      setSupabaseDbStatus("loading");
      setSupabaseDbError(null);
      try {
        const { error } = await supabase.from("businesses").select("id").limit(1);
        setSupabaseDbStatus(error ? "error" : "ok");
        if (error) setSupabaseDbError(error.message ?? "Chyba dotazu");
      } catch (e) {
        setSupabaseDbStatus("error");
        setSupabaseDbError((e as Error).message ?? "Chyba");
      }
    };
    run();
  }, [allowed, supabaseEnv]);

  useEffect(() => {
    if (!allowed || !supabaseEnv) return;
    const run = async () => {
      setSupabaseRpcStatus("loading");
      setSupabaseRpcError(null);
      try {
        const { error } = await supabase.rpc("rpc_get_public_business_info", {
          _business_id: DEMO_BUSINESS_ID,
        });
        setSupabaseRpcStatus(error ? "error" : "ok");
        if (error) setSupabaseRpcError(error.message ?? "Chyba RPC");
      } catch (e) {
        setSupabaseRpcStatus("error");
        setSupabaseRpcError((e as Error).message ?? "Chyba");
      }
    };
    run();
  }, [allowed, supabaseEnv]);

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

  const firebaseOk =
    firebaseEnv === true &&
    firebaseDbStatus === "ok" &&
    authStatus === "ok";
  const anySupabaseError = supabaseDbStatus === "error" || supabaseRpcStatus === "error";
  const anyFirebaseError = firebaseDbStatus === "error" || authStatus === "error";
  const overallOk = firebaseOk && supabaseEnv && supabaseDbStatus === "ok";
  const summaryClassName = getSummaryCardClassName(overallOk, anyFirebaseError, anySupabaseError);
  const firebaseLabel = getFirebaseStatusLabel(firebaseEnv, firebaseOk, firebaseDbStatus, authStatus);
  const supabaseLabel = getSupabaseStatusLabel(supabaseEnv, supabaseDbStatus, supabaseRpcStatus);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Diagnostika: Firebase + Supabase</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Test pripojenia na databázu a auth. Otvor s <code className="rounded bg-muted px-1">?key=diagnostics</code> v produkcii.
      </p>

      <div className="space-y-4">
        <Card className={summaryClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Celkový stav
              {overallOk && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Firebase (Auth + Firestore): {firebaseLabel}
            </p>
            <p className="text-muted-foreground">
              Supabase (DB + RPC): {supabaseLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Env (Project / Functions URL)</span>
              <StatusIcon status={firebaseEnv ? "ok" : "error"} />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Projekt: {EXPECTED_FIREBASE_PROJECT}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Firestore (businesses)</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(firebaseDbStatus, firebaseDbError)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Auth (session)</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(authStatus, authError, <span className="text-sm text-muted-foreground">{hasSession ? "áno" : "nie"}</span>)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Env (URL + Publishable Key)</span>
              <StatusIcon status={supabaseEnv ? "ok" : "error"} />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Projekt: {EXPECTED_SUPABASE_PROJECT}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Tabuľka businesses</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(supabaseDbStatus, supabaseDbError)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">RPC rpc_get_public_business_info</span>
              <span className="flex items-center gap-2">
                {renderStatusBlock(supabaseRpcStatus, supabaseRpcError)}
              </span>
            </div>
          </CardContent>
        </Card>

        {(anyFirebaseError || anySupabaseError) && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rýchly postup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Firebase: skontroluj VITE_FIREBASE_* a či máš Firestore s kolekciou businesses (demo dokument).</p>
              <p>Supabase: nastav <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> = <code className="rounded bg-muted px-1">https://hrkwqdvfeudxkqttpgls.supabase.co</code> a <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> z Dashboard → Settings → API. Spusti migrácie: <code className="rounded bg-muted px-1">.\supabase-db-push.ps1</code>, potom <code className="rounded bg-muted px-1">npm run supabase:deploy-functions</code>.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
