import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes, startOfDay, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar-overrides.css";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { generateSlots, type BusinessHours, type EmployeeSchedule, type ExistingAppointment } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format as fmtDate } from "date-fns";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }), getDay, locales: { sk } });

const SK_MESSAGES = {
  allDay: "Celý deň", previous: "‹", next: "›", today: "Dnes", month: "Mesiac", week: "Týždeň", day: "Deň", agenda: "Agenda",
  date: "Dátum", time: "Čas", event: "Udalosť", noEventsInRange: "Žiadne rezervácie v tomto období", showMore: (total: number) => `+${total} ďalších`,
};

interface ResourceCol { id: string; display_name: string; is_bookable: boolean; order_index: number | null; }
interface CalEvent { id: string; title: string; start: Date; end: Date; status?: string; eventType: "service_booking" | "private_note" | "blocked_time" | "internal_event" | "admin_booking_note"; resourceId: string; resource: any; }

export default function CalendarPage() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [resources, setResources] = useState<ResourceCol[]>([]);
  const [bookableEmployees, setBookableEmployees] = useState<ResourceCol[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});
  const [bookingModal, setBookingModal] = useState(false);
  const [adminEventModal, setAdminEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [bookForm, setBookForm] = useState({ service_id: "", employee_id: "", start_at: "" });
  const [adminForm, setAdminForm] = useState({ type: "private_note", title: "", note: "" });
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const [apptRes, adminRes] = await Promise.all([
      supabase.from("appointments").select("*, customers(full_name), services(name_sk), employees(display_name)").eq("business_id", businessId).order("start_at"),
      (supabase as any).from("calendar_events").select("*").eq("business_id", businessId).order("start_at"),
    ]);

    const apptEvents = (apptRes.data ?? []).map((a: any) => ({
      id: a.id,
      title: `${a.customers?.full_name ?? "?"} – ${a.services?.name_sk ?? "?"}`,
      start: new Date(a.start_at),
      end: new Date(a.end_at),
      status: a.status,
      eventType: "service_booking" as const,
      resourceId: a.employee_id,
      resource: a,
    }));

    const adminEvents = (adminRes.data ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_at),
      end: new Date(e.end_at),
      eventType: e.type,
      resourceId: e.resource_id,
      resource: e,
    }));

    setEvents([...apptEvents, ...adminEvents]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadEvents();
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle().then(({ data }) => setBusiness(data));
    supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true).then(({ data }) => setServices(data ?? []));

    supabase.functions.invoke("list-calendar-resources", { body: { business_id: businessId } }).then(({ data }) => {
      const rows = ((data as any)?.resources ?? []) as ResourceCol[];
      setResources(rows);
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        supabase.from("schedules").select("*").in("employee_id", ids).then(({ data: scheds }) => {
          const map: Record<string, EmployeeSchedule[]> = {};
          (scheds ?? []).forEach((s: any) => { if (!map[s.employee_id]) map[s.employee_id] = []; map[s.employee_id].push(s); });
          setSchedules(map);
        });
      }
    });

    supabase.functions.invoke("list-bookable-providers", { body: { business_id: businessId } }).then(({ data }) => {
      setBookableEmployees(((data as any)?.providers ?? []) as ResourceCol[]);
    });
  }, [businessId, loadEvents]);

  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;
    const dayStart = startOfDay(slotDate);
    const dayEnd = addDays(dayStart, 1);
    const { data: existing } = await supabase.from("appointments").select("start_at, end_at").eq("employee_id", employeeId).gte("start_at", dayStart.toISOString()).lt("start_at", dayEnd.toISOString()).neq("status", "cancelled");

    setAvailableSlots(generateSlots({
      date: slotDate,
      serviceDuration: service.duration_minutes,
      serviceBuffer: service.buffer_minutes ?? 0,
      openingHours: (business.opening_hours ?? {}) as BusinessHours,
      employeeSchedules: schedules[employeeId] ?? [],
      existingAppointments: (existing ?? []) as ExistingAppointment[],
      leadTimeMinutes: 0,
    }));
  }, [services, business, schedules]);

  useEffect(() => {
    if (bookForm.service_id && bookForm.employee_id && selectedSlot) loadAvailableSlots(selectedSlot.start, bookForm.employee_id, bookForm.service_id);
  }, [bookForm.service_id, bookForm.employee_id, selectedSlot, loadAvailableSlots]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (!isOwnerOrAdmin) return;
    setSelectedSlot(slotInfo);
    const resourceId = slotInfo.resourceId as string | undefined;
    const selectedResource = resources.find((r) => r.id === resourceId);
    if (selectedResource && !selectedResource.is_bookable) {
      setAdminForm({ type: "private_note", title: "", note: "" });
      setAdminEventModal(true);
      return;
    }
    setBookForm({ service_id: "", employee_id: resourceId ?? "", start_at: "" });
    setBookingModal(true);
  };

  const handleBook = async () => {
    if (!bookForm.service_id || !bookForm.employee_id || !bookForm.start_at) return toast.error("Vyplňte všetky polia");
    setSaving(true);
    const service = services.find((s) => s.id === bookForm.service_id);
    const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);
    const start = new Date(bookForm.start_at);
    const end = addMinutes(start, duration);
    const { data: customer } = await supabase.from("customers").upsert({ business_id: businessId, full_name: "Zákazník (osobne)", email: `walkin-${Date.now()}@internal` }, { onConflict: "business_id,email" }).select().single();
    const { error } = await supabase.from("appointments").insert({ business_id: businessId, customer_id: customer.id, employee_id: bookForm.employee_id, service_id: bookForm.service_id, start_at: start.toISOString(), end_at: end.toISOString(), status: "confirmed" });
    setSaving(false);
    if (error) return toast.error("Tento pracovník nie je bookovateľný pre službu.");
    toast.success("Rezervácia vytvorená");
    setBookingModal(false);
    loadEvents();
  };

  const handleCreateAdminEvent = async () => {
    if (!selectedSlot?.resourceId || !adminForm.title.trim()) return toast.error("Doplňte názov udalosti");
    setSaving(true);
    const { error, data } = await supabase.functions.invoke("upsert-admin-calendar-event", {
      body: {
        business_id: businessId,
        resource_id: selectedSlot.resourceId,
        start_at: selectedSlot.start.toISOString(),
        end_at: selectedSlot.end.toISOString(),
        type: adminForm.type,
        title: adminForm.title,
        note: adminForm.note,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? "Nepodarilo sa uložiť interný záznam");
    toast.success("Interný záznam uložený");
    setAdminEventModal(false);
    loadEvents();
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Kalendár</h1>{loading && <Loader2 className="w-5 h-5 animate-spin" />}</div>
      <div className="bg-card rounded-xl border p-4" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        <Calendar
          localizer={localizer}
          events={events}
          resources={resources}
          resourceIdAccessor="id"
          resourceTitleAccessor="display_name"
          resourceAccessor="resourceId"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          culture="sk"
          messages={SK_MESSAGES}
          selectable={isOwnerOrAdmin}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={(e: CalEvent) => ({ className: e.eventType === "service_booking" ? `status-${e.status}` : `admin-${e.eventType}` })}
          components={{ resourceHeader: ({ label, resource }: any) => <div className="flex items-center gap-2">{label}{resource?.is_bookable === false && <Badge variant="secondary">Admin</Badge>}</div> }}
          step={30}
          timeslots={2}
          popup
          style={{ height: "100%" }}
        />
      </div>

      <Dialog open={bookingModal} onOpenChange={setBookingModal}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nová rezervácia služby</DialogTitle></DialogHeader>
        {selectedSlot && <p className="text-sm text-muted-foreground">{fmtDate(selectedSlot.start, "EEEE, d. MMMM yyyy", { locale: sk })}</p>}
        <div className="space-y-3 py-2">
          <Label>Služba</Label><Select value={bookForm.service_id} onValueChange={(v) => setBookForm((f) => ({ ...f, service_id: v, start_at: "" }))}><SelectTrigger><SelectValue placeholder="Vyberte službu" /></SelectTrigger><SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_sk}</SelectItem>)}</SelectContent></Select>
          <Label>Pracovník</Label><Select value={bookForm.employee_id} onValueChange={(v) => setBookForm((f) => ({ ...f, employee_id: v, start_at: "" }))}><SelectTrigger><SelectValue placeholder="Vyberte pracovníka" /></SelectTrigger><SelectContent>{bookableEmployees.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent></Select>
          {availableSlots.length > 0 && <div className="grid grid-cols-4 gap-1.5">{availableSlots.map((slot) => <button key={slot.toISOString()} className="text-xs border rounded py-1" onClick={() => setBookForm((f) => ({ ...f, start_at: slot.toISOString() }))}>{fmtDate(slot, "HH:mm")}</button>)}</div>}
        </div>
        <Button onClick={handleBook} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Vytvoriť rezerváciu</Button>
      </DialogContent></Dialog>

      <Dialog open={adminEventModal} onOpenChange={setAdminEventModal}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Interný admin záznam</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label>Typ</Label><Select value={adminForm.type} onValueChange={(v) => setAdminForm((f) => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="private_note">Súkromná poznámka</SelectItem>
            <SelectItem value="blocked_time">Blokovaný čas</SelectItem>
            <SelectItem value="internal_event">Interná udalosť</SelectItem>
          </SelectContent></Select></div>
          <div className="space-y-1"><Label>Názov</Label><Input value={adminForm.title} onChange={(e) => setAdminForm((f) => ({ ...f, title: e.target.value }))} placeholder="Napr. Porada" /></div>
          <div className="space-y-1"><Label>Poznámka</Label><Input value={adminForm.note} onChange={(e) => setAdminForm((f) => ({ ...f, note: e.target.value }))} placeholder="Interná poznámka" /></div>
        </div>
        <Button onClick={handleCreateAdminEvent} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Uložiť</Button>
      </DialogContent></Dialog>
    </div>
  );
}
