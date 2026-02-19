import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { businessId } = useBusiness();
  const [business, setBusiness] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  useEffect(() => {
    supabase.from("businesses").select("*").eq("id", businessId).single().then(({ data }) => {
      if (data) setBusiness(data);
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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Nastavenia</h1>

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
    </div>
  );
}
