export declare const syncPush: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    applied: number;
    conflicts: {
        idempotency_key: string;
        reason: string;
    }[] | undefined;
}>, unknown>;
