import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

    setLoading(true);
    try {
      // Get challenge from server
      const { data: options, error: optErr } = await supabase.functions.invoke(
        "webauthn-register",
        { body: { action: "challenge" } }
      );

      if (optErr || !options) {
        toast.error("Nepodarilo sa získať registračnú výzvu");
        return false;
      }

      // Create credential
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
          attestation: options.attestation,
          authenticatorSelection: options.authenticatorSelection,
          excludeCredentials: (options.excludeCredentials || []).map(
            (c: { id: string; type: string }) => ({
              ...c,
              id: base64ToBuffer(c.id),
            })
          ),
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        toast.error("Registrácia passkey bola zrušená");
        return false;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = bufferToBase64url(credential.rawId);
      const publicKey = bufferToBase64url(response.getPublicKey?.() || response.attestationObject);

      // Save to server
      const { error: saveErr } = await supabase.functions.invoke("webauthn-register", {
        body: {
          action: "register",
          credentialId,
          publicKey,
          deviceName: deviceName || getDeviceName(),
        },
      });

      if (saveErr) {
        toast.error("Nepodarilo sa uložiť passkey");
        return false;
      }

      toast.success("Passkey bol úspešne zaregistrovaný!");
      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Registrácia bola zrušená");
      } else {
        toast.error("Chyba pri registrácii passkey");
      }
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

    setLoading(true);
    try {
      // Get challenge
      const { data: options, error: optErr } = await supabase.functions.invoke(
        "webauthn-authenticate",
        { body: { action: "challenge", email } }
      );

      if (optErr || !options) {
        toast.error("Nepodarilo sa získať výzvu");
        return false;
      }

      // Request credential
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64ToBuffer(options.challenge),
          rpId: options.rpId,
          timeout: options.timeout,
          userVerification: options.userVerification,
          allowCredentials: (options.allowCredentials || []).map(
            (c: { id: string; type: string }) => ({
              ...c,
              id: base64ToBuffer(c.id),
            })
          ),
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        toast.error("Autentifikácia bola zrušená");
        return false;
      }

      const credentialId = bufferToBase64url(credential.rawId);

      // Verify on server and get session
      const { data: verifyResult, error: verifyErr } = await supabase.functions.invoke(
        "webauthn-authenticate",
        { body: { action: "verify", credentialId } }
      );

      if (verifyErr || !verifyResult?.success) {
        toast.error("Passkey nebol rozpoznaný");
        return false;
      }

      // Use the magic link token to sign in
      if (verifyResult.token) {
        const { error: signInErr } = await supabase.auth.verifyOtp({
          email: verifyResult.email,
          token: verifyResult.token,
          type: "magiclink",
        });

        if (signInErr) {
          toast.error("Prihlásenie zlyhalo: " + signInErr.message);
          return false;
        }

        toast.success("Úspešne prihlásený cez passkey!");
        return true;
      }

      return false;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Autentifikácia bola zrušená");
      } else {
        toast.error("Chyba pri prihlásení cez passkey");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    loading,
    checkPlatformAuthenticator,
    registerPasskey,
    authenticateWithPasskey,
  };
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
