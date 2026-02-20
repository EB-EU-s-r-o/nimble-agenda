import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Check, X, Clock, User } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Čaká", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Potvrdená", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Zrušená", className: "bg-red-100 text-red-800" },
  completed: { label: "Dokončená", className: "bg-slate-100 text-slate-700" },
};

export default function AppointmentsPage() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    const statuses = ["pending", "confirmed", "cancelled", "completed"] as const;
    type AppStatus = typeof statuses[number];

    let q = supabase
      .from("appointments")
      .select("*, customers(full_name, email, phone), services(name_sk, price), employees(display_name)")
      .eq("business_id", businessId)
      .order("start_at", { ascending: false });

    if (statusFilter !== "all" && statuses.includes(statusFilter as AppStatus)) {
      q = q.eq("status", statusFilter as AppStatus);
    }

    const { data } = await q;
    setAppointments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [businessId, statusFilter]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "cancelled" | "completed") => {
    setUpdating(true);
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    setUpdating(false);
    if (error) { toast.error("Chyba pri aktualizácii"); return; }
    toast.success("Status aktualizovaný");
    setSelected(null);
    load();
  };

  const filtered = appointments.filter((a) => {
    const name = a.customers?.full_name?.toLowerCase() ?? "";
    const svc = a.services?.name_sk?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || svc.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Rezervácie</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Hľadať..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky</SelectItem>
              <SelectItem value="pending">Čakajúce</SelectItem>
              <SelectItem value="confirmed">Potvrdené</SelectItem>
              <SelectItem value="completed">Dokončené</SelectItem>
              <SelectItem value="cancelled">Zrušené</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Žiadne rezervácie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const s = STATUS_MAP[a.status] ?? STATUS_MAP.pending;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/30 transition-all"
              >
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{format(new Date(a.start_at), "d. M.", { locale: sk })}</p>
                  <p className="text-sm font-bold text-foreground">{format(new Date(a.start_at), "HH:mm")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.customers?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.services?.name_sk} · {a.employees?.display_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.services?.price && <span className="text-sm font-medium text-foreground">{a.services.price}€</span>}
                  <Badge className={`text-xs border-0 ${s.className}`}>{s.label}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rezervácia</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selected.customers?.full_name}</span>
                </div>
                {selected.customers?.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-muted-foreground text-center">@</span>
                    <span>{selected.customers.email}</span>
                  </div>
                )}
                {selected.customers?.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-muted-foreground">📞</span>
                    <span>{selected.customers.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <LogoIcon size="sm" className="w-4 h-4" />
                  <span>{selected.services?.name_sk}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(selected.start_at), "d. MMMM yyyy HH:mm", { locale: sk })} – {format(new Date(selected.end_at), "HH:mm")}</span>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {selected.status === "pending" && (
                    <Button size="sm" className="flex-1" onClick={() => updateStatus(selected.id, "confirmed")} disabled={updating}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {(selected.status === "confirmed" || selected.status === "pending") && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateStatus(selected.id, "completed")} disabled={updating}>
                      Dokončiť
                    </Button>
                  )}
                  {selected.status !== "cancelled" && selected.status !== "completed" && (
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "cancelled")} disabled={updating}>
                      <X className="w-3.5 h-3.5 mr-1" /> Zrušiť
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
