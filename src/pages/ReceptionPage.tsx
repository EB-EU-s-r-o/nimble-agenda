import { useEffect, useState, useCallback } from "react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import {
  createAppointmentOffline,
  listLocalAppointmentsForDay,
  updateAppointmentOffline,
  cancelAppointmentOffline,
} from "@/lib/offline/reception";
import { runSync } from "@/lib/offline/sync";
import type { OfflineAppointment } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Clock,
  User,
  Phone,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { sk } from "date-fns/locale";

function dayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-700 border-red-500/30",
  completed: "bg-blue-500/20 text-blue-700 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
};

export default function ReceptionPage() {
  const { businessId, isEmployee } = useBusiness();
  const { user } = useAuth();
  const [day, setDay] = useState(dayISO());
  const [items, setItems] = useState<OfflineAppointment[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    customer_name: "",
    customer_phone: "",
    employee_id: "",
    service_id: "",
    start_time: "",
    duration: 30,
  });

  useEffect(() => {
    if (!isEmployee || !user) {
      setMyEmployeeId(null);
      return;
    }

    supabase
      .from("employees")
      .select("id, is_active")
      .eq("business_id", businessId)
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.id || data.is_active === false) {
          setMyEmployeeId(null);
          return;
        }
        setMyEmployeeId(data.id);
      });
  }, [businessId, isEmployee, user]);

  const load = useCallback(async () => {
    const appts = await listLocalAppointmentsForDay(day);
    appts.sort((a, b) => a.start_at.localeCompare(b.start_at));
    const scoped = isEmployee && myEmployeeId ? appts.filter((a) => a.employee_id === myEmployeeId) : appts;
    setItems(scoped);
  }, [day, isEmployee, myEmployeeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load employees + services from Supabase (will use cached if offline)
  useEffect(() => {
    supabase
      .from("employees")
      .select("id, display_name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (!data) return;
        if (isEmployee && myEmployeeId) {
          setEmployees(data.filter((e) => e.id === myEmployeeId));
          setAddForm((f) => ({ ...f, employee_id: myEmployeeId }));
          return;
        }
        setEmployees(data);
      });
    supabase
      .from("services")
      .select("id, name_sk, duration_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setServices(data);
      });
  }, [businessId, isEmployee, myEmployeeId]);

  // Initial sync on mount
  useEffect(() => {
    if (navigator.onLine) {
      runSync().then(load);
    }
  }, [load]);

  const handleQuickWalkin = async () => {
    const id = crypto.randomUUID();
    const start = new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);

    await createAppointmentOffline({
      id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      customer_name: "Walk-in",
      status: "confirmed",
    });

    toast.success("Walk-in pridaný");
    await load();
  };

  const handleAddAppointment = async () => {
    if (!addForm.customer_name || !addForm.start_time) {
      toast.error("Vyplňte meno a čas");
      return;
    }

    const id = crypto.randomUUID();
    const startDate = new Date(`${day}T${addForm.start_time}:00`);
    const service = services.find((s) => s.id === addForm.service_id);
    const duration = service?.duration_minutes || addForm.duration;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    const effectiveEmployeeId = isEmployee ? myEmployeeId ?? "" : addForm.employee_id;
    const emp = employees.find((e) => e.id === effectiveEmployeeId);

    await createAppointmentOffline({
      id,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      customer_name: addForm.customer_name,
      customer_phone: addForm.customer_phone || undefined,
      employee_id: effectiveEmployeeId || undefined,
      employee_name: emp?.display_name || undefined,
      service_id: addForm.service_id || undefined,
      service_name: service?.name_sk || undefined,
      status: "confirmed",
    });

    toast.success("Rezervácia pridaná");
    setShowAdd(false);
    setAddForm({
      customer_name: "",
      customer_phone: "",
      employee_id: isEmployee ? myEmployeeId ?? "" : "",
      service_id: "",
      start_time: "",
      duration: 30,
    });
    await load();
  };

  const handleStatusChange = async (
    appt: OfflineAppointment,
    newStatus: OfflineAppointment["status"]
  ) => {
    if (newStatus === "cancelled") {
      await cancelAppointmentOffline(appt.id);
    } else {
      await updateAppointmentOffline({ id: appt.id, status: newStatus });
    }
    toast.success(`Status zmenený na: ${STATUS_LABELS[newStatus]}`);
    await load();
  };

  const currentDate = new Date(`${day}T12:00:00`);

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <OfflineBanner onConflictsClick={() => setShowConflicts(true)} />

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDay(dayISO(subDays(currentDate, 1)))}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Recepcia</h1>
          <p className="text-sm text-muted-foreground">
            {format(currentDate, "EEEE, d. MMMM yyyy", { locale: sk })}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDay(dayISO(addDays(currentDate, 1)))}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleQuickWalkin} variant="secondary" className="flex-1">
          <Plus className="w-4 h-4 mr-1" />
          Walk-in
        </Button>
        <Button onClick={() => setShowAdd(true)} className="flex-1">
          <Plus className="w-4 h-4 mr-1" />
          Nová rezervácia
        </Button>
      </div>

      {/* Appointment list */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Žiadne rezervácie na tento deň</p>
          </div>
        ) : (
          items.map((appt) => (
            <div
              key={appt.id}
              className="border border-border rounded-lg p-3 bg-card space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(appt.start_at).toLocaleTimeString("sk", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(appt.end_at).toLocaleTimeString("sk", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{appt.customer_name}</span>
                  </div>
                  {appt.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {appt.customer_phone}
                      </span>
                    </div>
                  )}
                  {appt.service_name && (
                    <span className="text-xs text-muted-foreground">
                      {appt.service_name}
                      {appt.employee_name ? ` · ${appt.employee_name}` : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs ${STATUS_COLORS[appt.status] || ""}`}
                  >
                    {STATUS_LABELS[appt.status] || appt.status}
                  </Badge>
                  {!appt.synced && (
                    <span className="text-[10px] text-muted-foreground italic">
                      offline
                    </span>
                  )}
                </div>
              </div>

              {appt.status !== "cancelled" && appt.status !== "completed" && (
                <div className="flex gap-1.5 pt-1 border-t border-border">
                  {appt.status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleStatusChange(appt, "confirmed")}
                    >
                      <Check className="w-3 h-3 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {appt.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleStatusChange(appt, "completed")}
                    >
                      <Check className="w-3 h-3 mr-1" /> Dokončiť
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={() => handleStatusChange(appt, "cancelled")}
                  >
                    <X className="w-3 h-3 mr-1" /> Zrušiť
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nová rezervácia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Meno zákazníka *</Label>
              <Input
                value={addForm.customer_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, customer_name: e.target.value }))
                }
                placeholder="Meno"
              />
            </div>
            <div>
              <Label>Telefón</Label>
              <Input
                value={addForm.customer_phone}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, customer_phone: e.target.value }))
                }
                placeholder="+421..."
              />
            </div>
            <div>
              <Label>Čas *</Label>
              <Input
                type="time"
                value={addForm.start_time}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, start_time: e.target.value }))
                }
              />
            </div>
            {services.length > 0 && (
              <div>
                <Label>Služba</Label>
                <Select
                  value={addForm.service_id}
                  onValueChange={(v) =>
                    setAddForm((f) => ({ ...f, service_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte službu" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name_sk} ({s.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {employees.length > 0 && !isEmployee && (
              <div>
                <Label>Zamestnanec</Label>
                <Select
                  value={addForm.employee_id}
                  onValueChange={(v) =>
                    setAddForm((f) => ({ ...f, employee_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte zamestnanca" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isEmployee && (
              <div>
                <Label>Zamestnanec</Label>
                <Input value={employees[0]?.display_name ?? "Nepriradený zamestnanec"} disabled />
              </div>
            )}
            <Button className="w-full" onClick={handleAddAppointment}>
              Vytvoriť
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConflictResolutionDialog
        open={showConflicts}
        onOpenChange={setShowConflicts}
        onResolved={load}
      />
    </div>
  );
}
