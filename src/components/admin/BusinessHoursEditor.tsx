import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, ExternalLink } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Pondelok" },
  { key: "tuesday", label: "Utorok" },
  { key: "wednesday", label: "Streda" },
  { key: "thursday", label: "Štvrtok" },
  { key: "friday", label: "Piatok" },
  { key: "saturday", label: "Sobota" },
  { key: "sunday", label: "Nedeľa" },
];

interface HourRow {
  id?: string;
  day_of_week: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
  sort_order: number;
}

interface OverrideRow {
  id?: string;
  override_date: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
  label: string;
}

interface LinkRow {
  id?: string;
  label: string;
  url: string;
  sort_order: number;
}

export function BusinessHoursEditor() {
  const { businessId } = useBusiness();
  const [hours, setHours] = useState<HourRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [hRes, oRes, lRes] = await Promise.all([
        supabase.from("business_hours").select("*").eq("business_id", businessId).order("sort_order"),
        supabase.from("business_date_overrides").select("*").eq("business_id", businessId).order("override_date"),
        supabase.from("business_quick_links").select("*").eq("business_id", businessId).order("sort_order"),
      ]);
      
      if (hRes.data?.length) {
        setHours(hRes.data.map((h: any) => ({
          id: h.id,
          day_of_week: h.day_of_week,
          mode: h.mode,
          start_time: h.start_time?.slice(0, 5) ?? "09:00",
          end_time: h.end_time?.slice(0, 5) ?? "17:00",
          sort_order: h.sort_order,
        })));
      } else {
        // Initialize with defaults
        setHours(DAYS.map((d, i) => ({
          day_of_week: d.key,
          mode: i < 5 ? "open" : i === 5 ? "on_request" : "closed",
          start_time: "09:00",
          end_time: "17:00",
          sort_order: i,
        })));
      }

      setOverrides((oRes.data ?? []).map((o: any) => ({
        id: o.id,
        override_date: o.override_date,
        mode: o.mode,
        start_time: o.start_time?.slice(0, 5) ?? "09:00",
        end_time: o.end_time?.slice(0, 5) ?? "17:00",
        label: o.label ?? "",
      })));

      setLinks((lRes.data ?? []).map((l: any) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        sort_order: l.sort_order,
      })));

      setLoading(false);
    };
    load();
  }, [businessId]);

  const updateHour = (idx: number, field: string, value: string) => {
    setHours((h) => h.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save hours: delete all then insert
      await supabase.from("business_hours").delete().eq("business_id", businessId);
      const hourInserts = hours.map((h) => ({
        business_id: businessId,
        day_of_week: h.day_of_week as any,
        mode: h.mode as any,
        start_time: h.start_time,
        end_time: h.end_time,
        sort_order: h.sort_order,
      }));
      const { error: hErr } = await supabase.from("business_hours").insert(hourInserts);
      if (hErr) throw hErr;

      // Save overrides
      await supabase.from("business_date_overrides").delete().eq("business_id", businessId);
      if (overrides.length) {
        const ovrInserts = overrides.map((o) => ({
          business_id: businessId,
          override_date: o.override_date,
          mode: o.mode as any,
          start_time: o.mode !== "closed" ? o.start_time : null,
          end_time: o.mode !== "closed" ? o.end_time : null,
          label: o.label || null,
        }));
        const { error: oErr } = await supabase.from("business_date_overrides").insert(ovrInserts);
        if (oErr) throw oErr;
      }

      // Save links
      await supabase.from("business_quick_links").delete().eq("business_id", businessId);
      if (links.length) {
        const linkInserts = links.map((l, i) => ({
          business_id: businessId,
          label: l.label,
          url: l.url,
          sort_order: i,
        }));
        const { error: lErr } = await supabase.from("business_quick_links").insert(linkInserts);
        if (lErr) throw lErr;
      }

      toast.success("Otváracie hodiny uložené");
    } catch (err: any) {
      toast.error(err.message ?? "Chyba pri ukladaní");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Weekly hours */}
      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Týždenné otváracie hodiny</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {hours.map((h, i) => (
            <div key={h.day_of_week} className="flex items-center gap-2">
              <span className="w-24 text-sm font-medium text-foreground">
                {DAYS.find((d) => d.key === h.day_of_week)?.label}
              </span>
              <Select value={h.mode} onValueChange={(v) => updateHour(i, "mode", v)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Otvorené</SelectItem>
                  <SelectItem value="closed">Zatvorené</SelectItem>
                  <SelectItem value="on_request">Na požiadanie</SelectItem>
                </SelectContent>
              </Select>
              {h.mode !== "closed" && (
                <>
                  <Input type="time" value={h.start_time} onChange={(e) => updateHour(i, "start_time", e.target.value)} className="w-28" />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" value={h.end_time} onChange={(e) => updateHour(i, "end_time", e.target.value)} className="w-28" />
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Date overrides */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Výnimky (sviatky, dovolenky)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOverrides((o) => [...o, {
            override_date: new Date().toISOString().slice(0, 10),
            mode: "closed",
            start_time: "09:00",
            end_time: "17:00",
            label: "",
          }])}>
            <Plus className="w-4 h-4 mr-1" /> Pridať
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {overrides.length === 0 && (
            <p className="text-sm text-muted-foreground">Žiadne výnimky</p>
          )}
          {overrides.map((o, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={o.override_date}
                onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, override_date: e.target.value } : x))}
                className="w-36"
              />
              <Select
                value={o.mode}
                onValueChange={(v) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, mode: v as any } : x))}
              >
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Otvorené</SelectItem>
                  <SelectItem value="closed">Zatvorené</SelectItem>
                  <SelectItem value="on_request">Na požiadanie</SelectItem>
                </SelectContent>
              </Select>
              {o.mode !== "closed" && (
                <>
                  <Input type="time" value={o.start_time} onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, start_time: e.target.value } : x))} className="w-28" />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" value={o.end_time} onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, end_time: e.target.value } : x))} className="w-28" />
                </>
              )}
              <Input
                value={o.label}
                onChange={(e) => setOverrides((ov) => ov.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Dôvod"
                className="w-28"
              />
              <Button size="icon" variant="ghost" onClick={() => setOverrides((ov) => ov.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Rýchle odkazy</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLinks((l) => [...l, { label: "", url: "", sort_order: l.length }])}>
            <Plus className="w-4 h-4 mr-1" /> Pridať
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground">Žiadne odkazy</p>
          )}
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={l.label}
                onChange={(e) => setLinks((ls) => ls.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                placeholder="Label"
                className="w-32"
              />
              <Input
                value={l.url}
                onChange={(e) => setLinks((ls) => ls.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                placeholder="URL"
                className="flex-1"
              />
              <Button size="icon" variant="ghost" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={saveAll} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Uložiť všetko
      </Button>
    </div>
  );
}
