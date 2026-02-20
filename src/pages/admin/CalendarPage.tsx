import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes, startOfDay, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { generateSlots, type BusinessHours, type EmployeeSchedule, type ExistingAppointment } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, X, Check } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { format as fmtDate } from "date-fns";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { sk },
});

const SK_MESSAGES = {
  allDay: "Celý deň", previous: "‹", next: "›", today: "Dnes",
  month: "Mesiac", week: "Týždeň", day: "Deň", agenda: "Agenda",
  date: "Dátum", time: "Čas", event: "Udalosť",
  noEventsInRange: "Žiadne rezervácie v tomto období",
  showMore: (total: number) => `+${total} ďalších`,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Čaká na potvrdenie", confirmed: "Potvrdená",
  cancelled: "Zrušená", completed: "Dokončená",
};

interface CalEvent {
  id: string; title: string; start: Date; end: Date; status: string; resource: any;
}

export default function CalendarPage() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});

  const [bookingModal, setBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bookForm, setBookForm] = useState({ service_id: "", employee_id: "", start_at: "" });
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [saving, setSaving] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, customers(full_name, phone), services(name_sk), employees(display_name)")
      .eq("business_id", businessId)
      .order("start_at");
    if (data) {
      setEvents(data.map((a) => ({
        id: a.id, title: `${a.customers?.full_name ?? "?"} – ${a.services?.name_sk ?? "?"}`,
        start: new Date(a.start_at), end: new Date(a.end_at), status: a.status, resource: a,
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadEvents();
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle().then(({ data }) => { if (data) setBusiness(data); });
    supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true).then(({ data }) => { if (data) setServices(data); });
    supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true).then(({ data }) => {
      if (data) {
        setEmployees(data);
        const ids = data.map((e: any) => e.id);
        if (ids.length) {
          supabase.from("schedules").select("*").in("employee_id", ids).then(({ data: scheds }) => {
            const map: Record<string, EmployeeSchedule[]> = {};
            (scheds ?? []).forEach((s: any) => {
              if (!map[s.employee_id]) map[s.employee_id] = [];
              map[s.employee_id].push(s);
            });
            setSchedules(map);
          });
        }
      }
    });
  }, [businessId, loadEvents]);

  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;

    const dayStart = startOfDay(slotDate);
    const dayEnd = addDays(dayStart, 1);

    const { data: existing } = await supabase
      .from("appointments")
      .select("start_at, end_at")
      .eq("employee_id", employeeId)
      .gte("start_at", dayStart.toISOString())
      .lt("start_at", dayEnd.toISOString())
      .neq("status", "cancelled");

    const slots = generateSlots({
      date: slotDate,
      serviceDuration: service.duration_minutes,
      serviceBuffer: service.buffer_minutes ?? 0,
      openingHours: (business.opening_hours ?? {}) as BusinessHours,
      employeeSchedules: schedules[employeeId] ?? [],
      existingAppointments: (existing ?? []) as ExistingAppointment[],
      leadTimeMinutes: 0, // Admin can book anytime
    });

    setAvailableSlots(slots);
  }, [services, business, schedules]);

  useEffect(() => {
    if (bookForm.service_id && bookForm.employee_id && selectedSlot) {
      loadAvailableSlots(selectedSlot.start, bookForm.employee_id, bookForm.service_id);
    }
  }, [bookForm.service_id, bookForm.employee_id, selectedSlot, loadAvailableSlots]);

  const handleSelectSlot = (slot: SlotInfo) => {
    if (!isOwnerOrAdmin) return;
    setSelectedSlot(slot);
    setBookForm({ service_id: "", employee_id: "", start_at: "" });
    setAvailableSlots([]);
    setBookingModal(true);
  };

  const handleSelectEvent = (event: CalEvent) => { setSelectedEvent(event); setDetailModal(true); };

  const handleBook = async () => {
    if (!bookForm.service_id || !bookForm.employee_id || !bookForm.start_at) { toast.error("Vyplňte všetky polia"); return; }
    setSaving(true);
    const service = services.find((s) => s.id === bookForm.service_id);
    const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);
    const start = new Date(bookForm.start_at);
    const end = addMinutes(start, duration);

    // Find or create a walk-in customer
    const { data: customer } = await supabase.from("customers")
      .upsert(
        { business_id: businessId, full_name: "Zákazník (osobne)", email: `walkin-${Date.now()}@internal` },
        { onConflict: "business_id,email" }
      )
      .select().single();
    if (!customer) { toast.error("Chyba pri vytváraní zákazníka"); setSaving(false); return; }

    const { error } = await supabase.from("appointments").insert({
      business_id: businessId, customer_id: customer.id, employee_id: bookForm.employee_id,
      service_id: bookForm.service_id, start_at: start.toISOString(), end_at: end.toISOString(), status: "confirmed",
    });
    setSaving(false);
    if (error) { toast.error("Chyba pri vytváraní rezervácie"); return; }
    toast.success("Rezervácia vytvorená"); setBookingModal(false); loadEvents();
  };

  const handleStatusChange = async (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", selectedEvent.id);
    setUpdatingStatus(false);
    if (error) { toast.error("Chyba pri aktualizácii"); return; }
    toast.success("Status aktualizovaný"); setDetailModal(false); loadEvents();
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kalendár</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="bg-card rounded-xl border border-border p-4" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        <Calendar
          localizer={localizer} events={events} view={view} onView={setView}
          date={date} onNavigate={setDate} culture="sk" messages={SK_MESSAGES}
          selectable={isOwnerOrAdmin} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent}
          eventPropGetter={(e: CalEvent) => ({ className: `status-${e.status}` })}
          step={30} timeslots={2} popup style={{ height: "100%" }}
        />
      </div>

      {/* Booking Modal */}
      <Dialog open={bookingModal} onOpenChange={setBookingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nová rezervácia</DialogTitle></DialogHeader>
          {selectedSlot && <p className="text-sm text-muted-foreground">{fmtDate(selectedSlot.start, "EEEE, d. MMMM yyyy", { locale: sk })}</p>}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Služba</Label>
              <Select value={bookForm.service_id} onValueChange={(v) => setBookForm((f) => ({ ...f, service_id: v, start_at: "" }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte službu" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_sk} ({s.duration_minutes} min{s.price ? `, ${s.price}€` : ""})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zamestnanec</Label>
              <Select value={bookForm.employee_id} onValueChange={(v) => setBookForm((f) => ({ ...f, employee_id: v, start_at: "" }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte zamestnanca" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {availableSlots.length > 0 && (
              <div className="space-y-1.5">
                <Label>Dostupný čas</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const iso = slot.toISOString();
                    return (
                      <button key={iso} onClick={() => setBookForm((f) => ({ ...f, start_at: iso }))}
                        className={`text-xs py-1.5 rounded-md border transition-colors font-medium ${bookForm.start_at === iso ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
                        {fmtDate(slot, "HH:mm")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {bookForm.service_id && bookForm.employee_id && availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Žiadne dostupné termíny</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setBookingModal(false)} className="flex-1">Zrušiť</Button>
            <Button onClick={handleBook} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Vytvoriť rezerváciu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail rezervácie</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <Badge className="text-xs border-0 bg-secondary text-secondary-foreground">
                {STATUS_LABELS[selectedEvent.status]}
              </Badge>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{selectedEvent.resource?.customers?.full_name}</span>
                </div>
                {selectedEvent.resource?.customers?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customers.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedEvent.resource?.services?.name_sk} · {selectedEvent.resource?.employees?.display_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} – {fmtDate(selectedEvent.end, "HH:mm")}</span>
                </div>
              </div>
              {isOwnerOrAdmin && selectedEvent.status !== "cancelled" && selectedEvent.status !== "completed" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {selectedEvent.status === "pending" && (
                    <Button size="sm" className="flex-1" onClick={() => handleStatusChange("confirmed")} disabled={updatingStatus}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Potvrdiť
                    </Button>
                  )}
                  {selectedEvent.status === "confirmed" && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleStatusChange("completed")} disabled={updatingStatus}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Dokončiť
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStatusChange("cancelled")} disabled={updatingStatus}>
                    <X className="w-3.5 h-3.5 mr-1" /> Zrušiť
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
