/**
 * Sets custom claim `role: 'authenticated'` for the current user so Supabase
 * Third-Party Auth (Firebase) accepts the JWT. Call once after sign-in;
 * merges with existing custom claims.
 */
export declare const ensureSupabaseRole: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    alreadySet: boolean;
}>, unknown>;
