export declare const webauthnRegisterChallenge: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    challenge: string;
    rp: {
        name: string;
        id: string;
    };
    user: {
        id: string;
        name: string;
        displayName: any;
    };
    excludeCredentials: {
        id: any;
        type: "public-key";
    }[];
    pubKeyCredParams: {
        alg: number;
        type: string;
    }[];
    timeout: number;
    attestation: string;
    authenticatorSelection: {
        authenticatorAttachment: string;
        residentKey: string;
        userVerification: "required";
    };
}>, unknown>;
export declare const webauthnRegister: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
