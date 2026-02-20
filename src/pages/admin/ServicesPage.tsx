import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { z } from "zod";

const serviceSchema = z.object({
  name_sk: z.string().min(2, "Názov musí mať aspoň 2 znaky"),
  duration_minutes: z.coerce.number().min(5, "Min. 5 minút"),
  buffer_minutes: z.coerce.number().min(0),
  price: z.coerce.number().min(0).optional(),
  description_sk: z.string().optional(),
});

type ServiceForm = z.infer<typeof serviceSchema>;
const emptyForm: ServiceForm = { name_sk: "", duration_minutes: 30, buffer_minutes: 0, price: undefined, description_sk: "" };

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("services").select("*").eq("business_id", businessId).order("name_sk");
    setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name_sk: s.name_sk, duration_minutes: s.duration_minutes, buffer_minutes: s.buffer_minutes, price: s.price ?? undefined, description_sk: s.description_sk ?? "" });
    setErrors({});
    setOpen(true);
  };

  const handleSave = async () => {
    const result = serviceSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }
    setSaving(true);
    const payload = {
      name_sk: result.data.name_sk,
      description_sk: result.data.description_sk ?? null,
      duration_minutes: result.data.duration_minutes,
      buffer_minutes: result.data.buffer_minutes,
      price: result.data.price ?? null,
      business_id: businessId,
    };
    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert([payload]);
    setSaving(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success(editing ? "Služba aktualizovaná" : "Služba pridaná");
    setOpen(false);
    load();
  };

  const handleToggle = async (s: any) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Skutočne chcete odstrániť túto službu?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error("Nemožno odstrániť — existujú rezervácie"); return; }
    toast.success("Služba odstránená");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Služby</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Pridať službu</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <LogoIcon size="md" className="mx-auto mb-3 opacity-30" />
          <p>Žiadne služby</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Pridať prvú službu</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className={`p-4 rounded-xl border border-border bg-card transition-opacity ${!s.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.name_sk}</p>
                  {s.description_sk && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description_sk}</p>}
                </div>
                <Switch checked={s.is_active} onCheckedChange={() => handleToggle(s)} />
              </div>
              <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span>{s.duration_minutes} min</span>
                {s.buffer_minutes > 0 && <span>+{s.buffer_minutes} min prestávka</span>}
                {s.price != null && <span className="ml-auto font-medium text-foreground">{s.price}€</span>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Upraviť
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Upraviť službu" : "Nová služba"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Názov</Label>
              <Input value={form.name_sk} onChange={(e) => setForm((f) => ({ ...f, name_sk: e.target.value }))} placeholder="Strihanie vlasov" />
              {errors.name_sk && <p className="text-destructive text-xs">{errors.name_sk}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Popis (voliteľný)</Label>
              <Input value={form.description_sk} onChange={(e) => setForm((f) => ({ ...f, description_sk: e.target.value }))} placeholder="Krátky popis..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Trvanie (min)</Label>
                <Input type="number" min={5} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: +e.target.value }))} />
                {errors.duration_minutes && <p className="text-destructive text-xs">{errors.duration_minutes}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Buffer (min)</Label>
                <Input type="number" min={0} value={form.buffer_minutes} onChange={(e) => setForm((f) => ({ ...f, buffer_minutes: +e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cena (€)</Label>
                <Input type="number" min={0} step={0.5} value={form.price ?? ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? +e.target.value : undefined }))} placeholder="—" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Zrušiť</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Uložiť" : "Pridať"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
