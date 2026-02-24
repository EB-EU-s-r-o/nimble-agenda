import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (error) {
        toast.error("Google prihlásenie zlyhalo: " + error.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google prihlásenie zlyhalo");
    }
    setGoogleLoading(false);
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
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { toast.error("Prihlásenie zlyhalo: " + error.message); return; }
    if (!rememberMe) sessionStorage.setItem("auth_session_tab_only", "true");
    else sessionStorage.removeItem("auth_session_tab_only");
    navigate("/admin");
  };

  const handleRegister = async (e: React.FormEvent) => {
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
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email na obnovenie hesla bol odoslaný");
    setMode("login");
  };

  const isLoading = loading || googleLoading;

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
            {/* Google Sign-In – shown on login & register */}
            {mode !== "forgot" && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Prihlásiť sa cez Google
              </Button>
            )}

            {mode !== "forgot" && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">alebo</span>
                </div>
              </div>
            )}

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
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
