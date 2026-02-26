export declare const syncPull: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    ok: boolean;
    appointments: {
        id: string;
        start_at: string;
        end_at: string;
        customer_name: string;
        customer_phone?: string;
        employee_id?: string;
        employee_name?: string;
        service_id?: string;
        service_name?: string;
        status: string;
        updated_at: string;
        synced: boolean;
    }[];
    days: number;
}>, unknown>;
