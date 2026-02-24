import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { DateTime } from "luxon";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar-overrides.css";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Check } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  normalizeAppointmentEvent,
  type NormalizedCalendarEvent,
  type RawAppointmentEvent,
} from "@/lib/calendarEventUtils";

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
  pending: "Čaká na potvrdenie",
  confirmed: "Potvrdená",
  cancelled: "Zrušená",
  completed: "Dokončená",
};


export default function MySchedulePage() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [events, setEvents] = useState<NormalizedCalendarEvent[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [businessTimezone, setBusinessTimezone] = useState(DEFAULT_BUSINESS_TIMEZONE);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NormalizedCalendarEvent | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Find my employee record
  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id")
      .eq("business_id", businessId)
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEmployeeId(data?.id ?? null);
      });
  }, [user, businessId]);


  useEffect(() => {
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.timezone) setBusinessTimezone(data.timezone);
      });
  }, [businessId]);
  const loadEvents = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, customers(full_name, phone), services(name_sk), employees(display_name)")
      .eq("business_id", businessId)
      .eq("employee_id", employeeId)
      .order("start_at");
    if (data) {
      setEvents(
        data.map((a) => normalizeAppointmentEvent(a as RawAppointmentEvent, businessTimezone))
      );
    }
    setLoading(false);
  }, [businessId, employeeId, businessTimezone]);

  useEffect(() => {
    if (employeeId) loadEvents();
  }, [employeeId, loadEvents]);

  const handleSelectEvent = (event: NormalizedCalendarEvent) => {
    setSelectedEvent(event);
    setDetailModal(true);
  };

  const handleMarkCompleted = async () => {
    if (!selectedEvent) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" as const })
      .eq("id", selectedEvent.id);
    setUpdatingStatus(false);
    if (error) {
      toast.error("Chyba pri aktualizácii");
      return;
    }
    toast.success("Rezervácia dokončená");
    setDetailModal(false);
    loadEvents();
  };

  if (!employeeId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Váš účet nie je prepojený so zamestnancom.</p>
        <p className="text-sm">Kontaktujte administrátora.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Môj rozvrh</h1>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      <div
        className="bg-card rounded-xl border border-border p-4"
        style={{ height: "calc(100vh - 200px)", minHeight: 500 }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          culture="sk"
          messages={SK_MESSAGES}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(e: NormalizedCalendarEvent) => ({ className: `status-${e.status}` })}
          components={{ event: ({ event }) => <CalendarEventCard event={event as NormalizedCalendarEvent} /> }}
          dayLayoutAlgorithm="no-overlap"
          step={30}
          timeslots={2}
          popup
          style={{ height: "100%" }}
        />
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail rezervácie</DialogTitle>
          </DialogHeader>
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
                  <span>{selectedEvent.resource?.services?.name_sk}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    {DateTime.fromJSDate(selectedEvent.start).setZone(selectedEvent.timezone).toFormat("d. M. yyyy HH:mm")} –{" "}
                    {DateTime.fromJSDate(selectedEvent.end).setZone(selectedEvent.timezone).toFormat("HH:mm")}
                  </span>
                </div>
              </div>
              {selectedEvent.status === "confirmed" && (
                <div className="pt-2 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleMarkCompleted}
                    disabled={updatingStatus}
                  >
                    {updatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-3.5 h-3.5 mr-1" /> Označiť ako dokončenú
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
