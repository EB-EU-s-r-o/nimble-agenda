export declare const webauthnAuthenticateChallenge: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    challenge: string;
    rpId: string;
    timeout: number;
    userVerification: string;
    allowCredentials: {
        id: string;
        type: string;
    }[];
}>, unknown>;
export declare const webauthnAuthenticate: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    email: string;
    customToken: string;
}>, unknown>;
