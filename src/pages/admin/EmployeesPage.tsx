import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

type DayKey = "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
type ScheduleMap = Partial<Record<DayKey, { start: string; end: string; active: boolean }>>;

const DEFAULT_SCHEDULE: ScheduleMap = Object.fromEntries(
  DAYS.map(({ key }) => [key, { start: "09:00", end: "17:00", active: !["saturday", "sunday"].includes(key) }])
) as ScheduleMap;

export default function EmployeesPage() {
  const { businessId } = useBusiness();
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ display_name: "", email: "", phone: "" });
  const [schedule, setSchedule] = useState<ScheduleMap>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: emps } = await supabase.from("employees").select("*").eq("business_id", businessId).order("display_name");
    if (!emps) { setLoading(false); return; }
    setEmployees(emps);

    const ids = emps.map((e) => e.id);
    if (ids.length) {
      const { data: scheds } = await supabase.from("schedules").select("*").in("employee_id", ids);
      const map: Record<string, any[]> = {};
      (scheds ?? []).forEach((s) => { if (!map[s.employee_id]) map[s.employee_id] = []; map[s.employee_id].push(s); });
      setSchedules(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ display_name: "", email: "", phone: "" });
    setSchedule(DEFAULT_SCHEDULE);
    setOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditing(emp);
    setForm({ display_name: emp.display_name, email: emp.email ?? "", phone: emp.phone ?? "" });
    const sched: ScheduleMap = { ...DEFAULT_SCHEDULE };
    (schedules[emp.id] ?? []).forEach((s) => {
      sched[s.day_of_week as DayKey] = { start: s.start_time, end: s.end_time, active: true };
    });
    DAYS.forEach(({ key }) => { if (!schedules[emp.id]?.find((s) => s.day_of_week === key)) { (sched[key as DayKey] as any).active = false; } });
    setSchedule(sched);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) { toast.error("Zadajte meno"); return; }
    setSaving(true);

    let empId = editing?.id;
    if (editing) {
      await supabase.from("employees").update({ display_name: form.display_name, email: form.email || null, phone: form.phone || null }).eq("id", editing.id);
    } else {
      const { data } = await supabase.from("employees").insert({ business_id: businessId, display_name: form.display_name, email: form.email || null, phone: form.phone || null }).select().single();
      empId = data?.id;
    }

    if (empId) {
      await supabase.from("schedules").delete().eq("employee_id", empId);
      type DayOfWeek = "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
      const rows = DAYS.filter(({ key }) => schedule[key as DayKey]?.active).map(({ key }) => ({
        employee_id: empId as string,
        day_of_week: key as DayOfWeek,
        start_time: schedule[key as DayKey]!.start,
        end_time: schedule[key as DayKey]!.end,
      }));
      if (rows.length) await supabase.from("schedules").insert(rows);
    }

    setSaving(false);
    toast.success(editing ? "Zamestnanec aktualizovaný" : "Zamestnanec pridaný");
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Skutočne odstrániť zamestnanca?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error("Nemožno odstrániť — existujú rezervácie"); return; }
    toast.success("Zamestnanec odstránený");
    load();
  };

  const setScheduleDay = (day: DayKey, field: "start" | "end" | "active", value: string | boolean) => {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Zamestnanci</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Pridať zamestnanca</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadni zamestnanci</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Pridať prvého zamestnanca</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => {
            const empSchedules = schedules[emp.id] ?? [];
            return (
              <div key={emp.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{emp.display_name}</p>
                    {emp.email && <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>}
                  </div>
                </div>
                {empSchedules.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {empSchedules.map((s) => (
                      <span key={s.id} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {DAYS.find((d) => d.key === s.day_of_week)?.label.slice(0, 2)} {s.start_time}–{s.end_time}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(emp)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />Upraviť
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(emp.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Upraviť zamestnanca" : "Nový zamestnanec"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Meno a priezvisko *</Label>
              <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Jana Nováková" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jana@salon.sk" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefón</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+421 900 000 000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pracovné hodiny</Label>
              {DAYS.map(({ key, label }) => {
                const day = schedule[key as DayKey];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Checkbox
                      id={`day-${key}`}
                      checked={day?.active ?? false}
                      onCheckedChange={(v) => setScheduleDay(key as DayKey, "active", !!v)}
                    />
                    <label htmlFor={`day-${key}`} className="text-sm w-20 text-foreground">{label}</label>
                    {day?.active && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          type="time"
                          value={day.start}
                          onChange={(e) => setScheduleDay(key as DayKey, "start", e.target.value)}
                          className="h-8 text-xs"
                        />
                        <span className="text-muted-foreground text-xs">–</span>
                        <Input
                          type="time"
                          value={day.end}
                          onChange={(e) => setScheduleDay(key as DayKey, "end", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
