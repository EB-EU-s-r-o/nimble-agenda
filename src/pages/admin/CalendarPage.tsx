import { useEffect, useState, useCallback } from "react";
import { addMinutes, startOfDay, addDays, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import { getFirebaseFirestore } from "@/integrations/firebase/config";
import { BookingCalendar, statusToColor, type BookingCalendarEvent, type BookingCalendarMode, type SlotInfo } from "@/components/booking-calendar";
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc } from "firebase/firestore";
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
  const [view, setView] = useState<BookingCalendarMode>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});
  const [memberships, setMemberships] = useState<{ profile_id: string; role: string }[]>([]);

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
    const firestore = getFirebaseFirestore();
    if (!firestore) { setLoading(false); return; }
    const apptSnap = await getDocs(query(collection(firestore, "appointments"), where("business_id", "==", businessId), orderBy("start_at")));
    const eventsList: CalEvent[] = [];
    for (const d of apptSnap.docs) {
      const a = d.data();
      const [custSnap, svcSnap] = await Promise.all([
        getDoc(doc(firestore, "customers", a.customer_id)),
        getDoc(doc(firestore, "services", a.service_id)),
      ]);
      eventsList.push({
        id: d.id,
        title: `${custSnap.data()?.full_name ?? "?"} – ${svcSnap.data()?.name_sk ?? "?"}`,
        start: new Date(a.start_at),
        end: new Date(a.end_at),
        status: a.status,
        resource: { ...a, id: d.id },
      });
    }
    setEvents(eventsList);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadEvents();
    const firestore = getFirebaseFirestore();
    if (!firestore) return;
    getDoc(doc(firestore, "businesses", businessId)).then((snap) => { if (snap.exists()) setBusiness(snap.data()); });
    getDocs(query(collection(firestore, "services"), where("business_id", "==", businessId), where("is_active", "==", true))).then((snap) => { setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); });
    getDocs(query(collection(firestore, "employees"), where("business_id", "==", businessId), where("is_active", "==", true))).then((snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmployees(data);
      const ids = data.map((e: any) => e.id);
      if (ids.length) getDocs(query(collection(firestore, "schedules"), where("employee_id", "in", ids.slice(0, 10)))).then((schedSnap) => {
        const map: Record<string, EmployeeSchedule[]> = {};
        schedSnap.docs.forEach((s) => { const d = s.data(); if (!map[d.employee_id]) map[d.employee_id] = []; map[d.employee_id].push({ day_of_week: d.day_of_week, start_time: d.start_time, end_time: d.end_time }); });
        setSchedules(map);
      });
    });
    getDocs(query(collection(firestore, "memberships"), where("business_id", "==", businessId))).then((snap) => { setMemberships(snap.docs.map((d) => d.data())); });
  }, [businessId, loadEvents]);

  // Filter employees based on allow_admin_as_provider setting
  const filteredEmployees = useCallback(() => {
    if (business?.allow_admin_as_provider) return employees;
    return employees.filter((emp: any) => {
      if (!emp.profile_id) return true;
      const membership = memberships.find((m) => m.profile_id === emp.profile_id);
      if (!membership) return true;
      return membership.role === "employee";
    });
  }, [employees, business, memberships]);

  const loadAvailableSlots = useCallback(async (slotDate: Date, employeeId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || !employeeId || !business) return;

    const dayStart = startOfDay(slotDate);
    const dayEnd = addDays(dayStart, 1);

    const firestore = getFirebaseFirestore();
    let existing: { start_at: string; end_at: string }[] = [];
    if (firestore) {
      const apptSnap = await getDocs(
        query(
          collection(firestore, "appointments"),
          where("employee_id", "==", employeeId),
          where("start_at", ">=", dayStart.toISOString()),
          where("start_at", "<", dayEnd.toISOString())
        )
      );
      existing = apptSnap.docs.filter((d) => d.data().status !== "cancelled").map((d) => ({ start_at: d.data().start_at, end_at: d.data().end_at }));
    }

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

  const handleSelectEvent = (event: BookingCalendarEvent) => {
    const res = event.resource as { status?: string } | undefined;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: res?.status ?? "pending",
      resource: event.resource,
    });
    setDetailModal(true);
  };

  const bookingCalendarEvents: BookingCalendarEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    color: statusToColor(e.status),
    resource: e.resource,
  }));

  const handleBook = async () => {
    if (!bookForm.service_id || !bookForm.employee_id || !bookForm.start_at) { toast.error("Vyplňte všetky polia"); return; }
    setSaving(true);
    const service = services.find((s) => s.id === bookForm.service_id);
    const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);
    const start = new Date(bookForm.start_at);
    const end = addMinutes(start, duration);

    const firestore = getFirebaseFirestore();
    if (!firestore) { setSaving(false); return; }
    const walkinEmail = `walkin-${Date.now()}@internal`;
    const existingSnap = await getDocs(query(collection(firestore, "customers"), where("business_id", "==", businessId), where("email", "==", walkinEmail)));
    let customerId: string;
    if (!existingSnap.empty) {
      customerId = existingSnap.docs[0].id;
    } else {
      const newCust = await addDoc(collection(firestore, "customers"), {
        business_id: businessId,
        full_name: "Zákazník (osobne)",
        email: walkinEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      customerId = newCust.id;
    }
    await addDoc(collection(firestore, "appointments"), {
      business_id: businessId,
      customer_id: customerId,
      employee_id: bookForm.employee_id,
      service_id: bookForm.service_id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    toast.success("Rezervácia vytvorená");
    setBookingModal(false);
    loadEvents();
  };

  const handleStatusChange = async (newStatus: "pending" | "confirmed" | "cancelled" | "completed") => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    const firestore = getFirebaseFirestore();
    if (!firestore) { setUpdatingStatus(false); return; }
    try {
      await updateDoc(doc(firestore, "appointments", selectedEvent.id), { status: newStatus, updated_at: new Date().toISOString() });
    } catch {
      toast.error("Chyba pri aktualizácii");
      setUpdatingStatus(false);
      return;
    }
    setUpdatingStatus(false);
    toast.success("Status aktualizovaný"); setDetailModal(false); loadEvents();
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kalendár</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-0" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        <BookingCalendar
          events={bookingCalendarEvents}
          date={date}
          setDate={setDate}
          mode={view}
          setMode={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={isOwnerOrAdmin}
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
                <SelectContent>{filteredEmployees().map((e: any) => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
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
                  <span className="font-medium">
                    {selectedEvent.resource?.customers?.full_name ?? selectedEvent.title}
                  </span>
                </div>
                {selectedEvent.resource?.customers?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customers.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {selectedEvent.resource?.services?.name_sk && selectedEvent.resource?.employees?.display_name
                      ? `${selectedEvent.resource.services.name_sk} · ${selectedEvent.resource.employees.display_name}`
                      : selectedEvent.title}
                  </span>
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
