import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Mail, Users, Shield } from "lucide-react";
import { BusinessHoursEditor } from "@/components/admin/BusinessHoursEditor";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { businessId, isOwner } = useBusiness();
  const [business, setBusiness] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [smtpForm, setSmtpForm] = useState({ host: "", port: "", user: "", from: "", pass: "" });
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  useEffect(() => {
    // Load business WITHOUT smtp_config – passwords should never reach the client
    supabase.from("businesses").select("id, name, address, phone, email, timezone, lead_time_minutes, max_days_ahead, cancellation_hours, onboarding_completed, opening_hours, logo_url, slug, smtp_config, allow_admin_as_provider").eq("id", businessId).single().then(({ data }) => {
      if (data) {
        setBusiness(data);
        const smtp = (data as any).smtp_config as any ?? {};
        setSmtpForm({
          host: smtp.host ?? "",
          port: smtp.port ?? "",
          user: smtp.user ?? "",
          from: smtp.from ?? "",
          pass: "", // Never load actual password to client
        });
        setSmtpHasPassword(!!(smtp.pass));
      }
    });
  }, [businessId]);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: profileForm.full_name, phone: profileForm.phone || null }).eq("id", profile!.id);
    setSaving(false);
    if (error) { toast.error("Chyba pri ukladaní"); return; }
    await refreshProfile();
    toast.success("Profil aktualizovaný");
  };

  const saveBusiness = async () => {
    if (!business) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name: business.name,
      address: business.address,
      phone: business.phone,
      email: business.email,
      timezone: business.timezone,
      lead_time_minutes: business.lead_time_minutes,
      max_days_ahead: business.max_days_ahead,
      cancellation_hours: business.cancellation_hours,
    }).eq("id", businessId);
    setSaving(false);
    if (error) { toast.error("Chyba pri ukladaní"); return; }
    toast.success("Nastavenia firmy aktualizované");
  };

  const setB = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBusiness((b: any) => ({ ...b, [k]: k.includes("minutes") || k.includes("hours") || k.includes("ahead") ? +e.target.value : e.target.value }));

  const saveSmtp = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-smtp-config", {
        body: {
          business_id: businessId,
          host: smtpForm.host,
          port: smtpForm.port,
          user: smtpForm.user,
          from: smtpForm.from,
          pass: smtpForm.pass || undefined, // Only send if user typed a new password
        },
      });
      if (error) { toast.error("Chyba pri ukladaní SMTP"); return; }
      toast.success("SMTP nastavenia uložené");
      if (smtpForm.pass) setSmtpHasPassword(true);
      setSmtpForm((f) => ({ ...f, pass: "" })); // Clear password from memory
    } catch {
      toast.error("Chyba pri ukladaní SMTP");
    } finally {
      setSaving(false);
    }
  };

  const saveBookingSettings = async () => {
    if (!business) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ allow_admin_as_provider: business.allow_admin_as_provider })
      .eq("id", businessId);
    setSaving(false);
    if (error) {
      toast.error("Chyba pri ukladaní nastavení booking");
      return;
    }
    toast.success("Nastavenia booking uložené");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Nastavenia</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Všeobecné</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="hours">Otváracie hodiny</TabsTrigger>
          <TabsTrigger value="smtp">SMTP Email</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          {business && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Nastavenia firmy</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Názov firmy</Label>
                    <Input value={business.name ?? ""} onChange={setB("name")} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Adresa</Label>
                    <Input value={business.address ?? ""} onChange={setB("address")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefón</Label>
                    <Input value={business.phone ?? ""} onChange={setB("phone")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={business.email ?? ""} onChange={setB("email")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min. čas rezervácie vopred (min)</Label>
                    <Input type="number" value={business.lead_time_minutes ?? 60} onChange={setB("lead_time_minutes")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max. dní dopredu</Label>
                    <Input type="number" value={business.max_days_ahead ?? 60} onChange={setB("max_days_ahead")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Storno lehota (hod)</Label>
                    <Input type="number" value={business.cancellation_hours ?? 24} onChange={setB("cancellation_hours")} />
                  </div>
                </div>
                <Button onClick={saveBusiness} disabled={saving} size="sm">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Uložiť nastavenia
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="booking" className="space-y-6 mt-4">
          {business && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nastavenia rezervácií
                </CardTitle>
                <CardDescription>
                  Spravujte kto môže byť vybraný ako vykonávateľ služby
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">
                        Povoliť administrátora ako vykonávateľa služby
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keď je zapnuté, administrátori a majitelia s priradeným profilom zamestnanca 
                      budú dostupní vo výbere pracovníkov pri vytváraní rezervácie služby.
                    </p>
                  </div>
                  <Switch
                    checked={business.allow_admin_as_provider ?? false}
                    disabled={!isOwner}
                    onCheckedChange={(checked) => {
                      setBusiness((b: any) => ({ ...b, allow_admin_as_provider: checked }));
                    }}
                  />
                </div>
                {!isOwner && (
                  <p className="text-xs text-muted-foreground italic">
                    Toto nastavenie môže meniť iba majiteľ salónu.
                  </p>
                )}
                {isOwner && (
                  <Button onClick={saveBookingSettings} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Uložiť nastavenia
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <BusinessHoursEditor />
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6 mt-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                SMTP Nastavenia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>SMTP Server (host)</Label>
                  <Input value={smtpForm.host} onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input value={smtpForm.port} onChange={(e) => setSmtpForm((f) => ({ ...f, port: e.target.value }))} placeholder="465" />
                </div>
                <div className="space-y-1.5">
                  <Label>Používateľ (login)</Label>
                  <Input value={smtpForm.user} onChange={(e) => setSmtpForm((f) => ({ ...f, user: e.target.value }))} placeholder="user@example.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Odosielateľ (From)</Label>
                  <Input value={smtpForm.from} onChange={(e) => setSmtpForm((f) => ({ ...f, from: e.target.value }))} placeholder="booking@example.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Heslo {smtpHasPassword && <span className="text-xs text-muted-foreground ml-1">(uložené – zadajte nové pre zmenu)</span>}</Label>
                  <Input type="password" value={smtpForm.pass} onChange={(e) => setSmtpForm((f) => ({ ...f, pass: e.target.value }))} placeholder={smtpHasPassword ? "••••••••" : "Zadajte heslo"} />
                </div>
              </div>
              <Button onClick={saveSmtp} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Uložiť SMTP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 mt-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Môj profil</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Celé meno</Label>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefón</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+421 900 000 000" />
              </div>
              <Button onClick={saveProfile} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Uložiť profil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
