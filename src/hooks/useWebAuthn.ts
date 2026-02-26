import { useState, useCallback } from "react";
import { getFirebaseAuth, getFirebaseFunctions } from "@/integrations/firebase/config";
import { httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { toast } from "sonner";

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function useWebAuthn() {
  const [loading, setLoading] = useState(false);
  const isSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

  const checkPlatformAuthenticator = useCallback(async () => {
    if (!isSupported) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }, [isSupported]);

  const registerPasskey = useCallback(async (deviceName?: string) => {
    if (!isSupported) {
      toast.error("Váš prehliadač nepodporuje passkeys");
      return false;
    }
    const functions = getFirebaseFunctions();
    if (!functions) {
      toast.error("Funkcie nie sú dostupné");
      return false;
    }
    setLoading(true);
    try {
      const getChallenge = httpsCallable<unknown, { challenge: string; rp: unknown; user: { id: string; name: string; displayName: string }; pubKeyCredParams: unknown[]; timeout: number; attestation: string; authenticatorSelection: unknown; excludeCredentials: { id: string; type: string }[] }>(functions, "webauthnRegisterChallenge");
      const { data: options } = await getChallenge({});
      if (!options) {
        toast.error("Nepodarilo sa získať registračnú výzvu");
        return false;
      }
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: base64ToBuffer(options.challenge),
          rp: options.rp,
          user: {
            id: new TextEncoder().encode(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          timeout: options.timeout,
          attestation: options.attestation as AttestationConveyancePreference,
          authenticatorSelection: options.authenticatorSelection as AuthenticatorSelectionCriteria,
          excludeCredentials: (options.excludeCredentials || []).map((c) => ({ ...c, id: base64ToBuffer(c.id) })),
        },
      })) as PublicKeyCredential | null;
      if (!credential) {
        toast.error("Registrácia passkey bola zrušená");
        return false;
      }
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64url(credential.rawId);
      const publicKey = bufferToBase64url(response.getPublicKey?.() || response.attestationObject);
      const register = httpsCallable<{ credentialId: string; publicKey: string; deviceName?: string }, { success?: boolean }>(functions, "webauthnRegister");
      await register({ credentialId, publicKey, deviceName: deviceName || getDeviceName() });
      toast.success("Passkey bol úspešne zaregistrovaný!");
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") toast.error("Registrácia bola zrušená");
      else toast.error("Chyba pri registrácii passkey");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const authenticateWithPasskey = useCallback(async (email?: string) => {
    if (!isSupported) {
      toast.error("Váš prehliadač nepodporuje passkeys");
      return false;
    }
    const auth = getFirebaseAuth();
    const functions = getFirebaseFunctions();
    if (!auth || !functions) {
      toast.error("Prihlásenie nie je dostupné");
      return false;
    }
    setLoading(true);
    try {
      const getChallenge = httpsCallable<{ email?: string }, { challenge: string; rpId: string; timeout: number; userVerification: string; allowCredentials: { id: string; type: string }[] }>(functions, "webauthnAuthenticateChallenge");
      const { data: options } = await getChallenge({ email });
      if (!options) {
        toast.error("Nepodarilo sa získať výzvu");
        return false;
      }
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64ToBuffer(options.challenge),
          rpId: options.rpId,
          timeout: options.timeout,
          userVerification: options.userVerification as UserVerificationRequirement,
          allowCredentials: (options.allowCredentials || []).map((c) => ({ ...c, id: base64ToBuffer(c.id) })),
        },
      })) as PublicKeyCredential | null;
      if (!credential) {
        toast.error("Autentifikácia bola zrušená");
        return false;
      }
      const credentialId = bufferToBase64url(credential.rawId);
      const verify = httpsCallable<{ credentialId: string }, { success: boolean; email?: string; customToken?: string }>(functions, "webauthnAuthenticate");
      const { data: verifyResult } = await verify({ credentialId });
      if (!verifyResult?.success || !verifyResult.customToken) {
        toast.error("Passkey nebol rozpoznaný");
        return false;
      }
      await signInWithCustomToken(auth, verifyResult.customToken);
      toast.success("Úspešne prihlásený cez passkey!");
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") toast.error("Autentifikácia bola zrušená");
      else toast.error("Chyba pri prihlásení cez passkey");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return { isSupported, loading, checkPlatformAuthenticator, registerPasskey, authenticateWithPasskey };
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "Zariadenie";
}
