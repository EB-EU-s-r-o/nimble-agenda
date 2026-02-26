export type TestStatus = "idle" | "loading" | "ok" | "error";

export function getFirebaseStatusLabel(
  firebaseEnv: boolean | null,
  firebaseOk: boolean,
  firebaseDbStatus: TestStatus,
  authStatus: TestStatus
): string {
  if (firebaseEnv === null) return "—";
  if (firebaseOk) return "OK";
  if (firebaseDbStatus === "loading" || authStatus === "loading") return "načítavam…";
  return "chyba";
}

export function getSupabaseStatusLabel(
  supabaseEnv: boolean | null,
  supabaseDbStatus: TestStatus,
  supabaseRpcStatus: TestStatus
): string {
  if (supabaseEnv === null) return "—";
  if (supabaseEnv === true) {
    if (supabaseDbStatus === "loading" || supabaseRpcStatus === "loading") return "načítavam…";
    if (supabaseDbStatus === "ok") return "OK";
    return "chyba";
  }
  return "nenastavené (env)";
}

export function getSummaryCardClassName(
  overallOk: boolean,
  anyFirebaseError: boolean,
  anySupabaseError: boolean
): string {
  if (overallOk) return "border-green-500/50 bg-green-500/5";
  if (anyFirebaseError || anySupabaseError) return "border-amber-500/50 bg-amber-500/5";
  return "";
}
