import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseAuth, isFirebaseAuthEnabled } from "@/integrations/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(6, "Heslo musí mať aspoň 6 znakov"),
});

const registerSchema = loginSchema;

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode");
  const urlEmail = searchParams.get("email") ?? "";
  const claimToken = sessionStorage.getItem("claim_token") ?? "";

  const [mode, setMode] = useState<"login" | "register" | "forgot">(
    urlMode === "register" ? "register" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: urlEmail, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("auth_remember_me") === "true";
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (checked) {
      localStorage.setItem("auth_remember_me", "true");
    } else {
      localStorage.removeItem("auth_remember_me");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0] as string] = err.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    if (isFirebaseAuthEnabled()) {
      const auth = getFirebaseAuth();
      if (!auth) { setLoading(false); return; }
      try {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        if (!rememberMe) sessionStorage.setItem("auth_session_tab_only", "true");
        else sessionStorage.removeItem("auth_session_tab_only");
        navigate("/admin");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Prihlásenie zlyhalo";
        toast.error(msg);
      }
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { toast.error("Prihlásenie zlyhalo: " + error.message); return; }
    if (!rememberMe) sessionStorage.setItem("auth_session_tab_only", "true");
    else sessionStorage.removeItem("auth_session_tab_only");
    navigate("/admin");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) errs[err.path[0] as string] = err.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    if (isFirebaseAuthEnabled()) {
      const auth = getFirebaseAuth();
      if (!auth) { setLoading(false); return; }
      try {
        await createUserWithEmailAndPassword(auth, form.email, form.password);
        toast.success("Registrácia úspešná.");
        navigate("/admin");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Registrácia zlyhala";
        toast.error(msg);
      }
      setLoading(false);
      return;
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { emailRedirectTo: window.location.origin + "/admin" },
    });
    setLoading(false);
    if (error) { toast.error("Registrácia zlyhala: " + error.message); return; }
    if (claimToken && signUpData?.session) {
      try {
        await supabase.functions.invoke("claim-booking", { body: { claim_token: claimToken } });
        sessionStorage.removeItem("claim_token");
        toast.success("Registrácia úspešná! Rezervácia bola prepojená s vaším účtom.");
        navigate("/admin");
        return;
      } catch {
        sessionStorage.removeItem("claim_token");
      }
    }
    toast.success("Registrácia úspešná! Skontrolujte email pre potvrdenie.");
    setMode("login");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) { setErrors({ email: "Zadajte email" }); return; }
    setLoading(true);
    if (isFirebaseAuthEnabled()) {
      const auth = getFirebaseAuth();
      if (!auth) { setLoading(false); return; }
      try {
        await sendPasswordResetEmail(auth, form.email);
        toast.success("Email na obnovenie hesla bol odoslaný");
        setMode("login");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Odoslanie zlyhalo");
      }
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email na obnovenie hesla bol odoslaný");
    setMode("login");
  };

  const isLoading = loading;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-secondary to-background p-4 safe-x safe-y relative overflow-x-hidden">
      <div className="fixed top-4 right-4 z-50 safe-top safe-right" style={{ top: "max(1rem, env(safe-area-inset-top))", right: "max(1rem, env(safe-area-inset-right))" }}>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md min-w-0">
        <div className="flex items-center justify-center gap-2 mb-8">
          <LogoIcon size="md" />
          <span className="text-2xl font-bold text-foreground">PAPI HAIR DESIGN</span>
        </div>

        <Card className="shadow-lg border-gold/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Prihlásenie" : mode === "register" ? "Registrácia" : "Obnova hesla"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Prihláste sa do svojho účtu"
                : mode === "register"
                ? "Vytvorte si nový účet"
                : "Zadajte email pre obnovu hesla"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgot} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="jana@example.sk" value={form.email} onChange={set("email")} disabled={isLoading} />
                {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Heslo</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} disabled={isLoading} />
                  {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                </div>
              )}

              {/* Remember me checkbox - only on login */}
              {mode === "login" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => handleRememberMeChange(checked === true)}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                    Zapamätať si ma
                  </Label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === "login" ? "Prihlásiť sa" : mode === "register" ? "Zaregistrovať sa" : "Odoslať email"}
              </Button>
            </form>

            <div className="text-center text-sm space-y-2">
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline block w-full">
                    Zabudnuté heslo?
                  </button>
                  <p className="text-muted-foreground">
                    Nemáte účet?{" "}
                    <button onClick={() => setMode("register")} className="text-primary hover:underline">
                      Zaregistrovať sa
                    </button>
                  </p>
                </>
              )}
              {mode === "register" && (
                <p className="text-muted-foreground">
                  Máte účet?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline">
                    Prihlásiť sa
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button onClick={() => setMode("login")} className="text-primary hover:underline">
                  Späť na prihlásenie
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 space-y-1">
          <a href="/demo" className="text-primary hover:underline block">
            Demo účet – vyskúšať bez registrácie
          </a>
          <span>
            Rezervácia?{" "}
            <a href="/booking" className="text-primary hover:underline">
              Online rezervácia
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
