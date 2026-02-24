import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO, format as fmtDate } from "date-fns";
import { sk } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar-overrides.css";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS_TZ } from "@/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, User, Clock, Phone, Check } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";

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

/**
 * Safe fallback for string fields - NEVER show "?" or "–"
 */
function safeString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  resource: any;
}

export default function MySchedulePage() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
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
        if (data?.id) {
          setEmployeeId(data.id);
        } else {
          supabase
            .from("employees")
            .select("id")
            .eq("business_id", businessId)
            .limit(1)
            .maybeSingle()
            .then(({ data: emp }) => {
              setEmployeeId(emp?.id ?? "demo-employee-001");
            });
        }
      });
  }, [user, businessId]);

  /**
   * FIX: Timezone handling for react-big-calendar
   * 
   * ROOT CAUSE: react-big-calendar treats Date objects as local time by default.
   * When we pass new Date(isoString), it interprets the ISO string as local time,
   * not UTC. This causes the -2 hour shift.
   * 
   * SOLUTION: Parse ISO strings as UTC first, then convert to local timezone
   * by extracting the time components in the target timezone and setting them
   * on a new Date object.
   */
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
        data.map((a) => {
          // Parse ISO as UTC first
          const startUtc = parseISO(a.start_at);
          const endUtc = parseISO(a.end_at);
          
          // Get time in business timezone using Intl
          const startParts = new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS_TZ,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
          }).formatToParts(startUtc);
          
          const endParts = new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS_TZ,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
          }).formatToParts(endUtc);
          
          const startHour = Number.parseInt(startParts.find(p => p.type === 'hour')?.value ?? '0', 10);
          const startMin = Number.parseInt(startParts.find(p => p.type === 'minute')?.value ?? '0', 10);
          const endHour = Number.parseInt(endParts.find(p => p.type === 'hour')?.value ?? '0', 10);
          const endMin = Number.parseInt(endParts.find(p => p.type === 'minute')?.value ?? '0', 10);
          
          // Create Date with correct local time components for react-big-calendar
          const startLocal = new Date(startUtc);
          startLocal.setHours(startHour, startMin, 0, 0);
          
          const endLocal = new Date(endUtc);
          endLocal.setHours(endHour, endMin, 0, 0);
          
          // Safe fallbacks - NEVER show "?" or "–"
          const customerName = safeString(a.customers?.full_name, "Neznámy klient");
          const serviceName = safeString(a.services?.name_sk, "Bez názvu služby");
          
          return {
            id: a.id,
            title: `${customerName} – ${serviceName}`,
            start: startLocal,
            end: endLocal,
            status: a.status,
            resource: a,
          };
        })
      );
    }
    setLoading(false);
  }, [businessId, employeeId]);

  useEffect(() => {
    if (employeeId) loadEvents();
  }, [employeeId, loadEvents]);

  const handleSelectEvent = (event: CalEvent) => {
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
        className="bg-card rounded-xl border border-border p-4 calendar-container"
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
          eventPropGetter={(e: CalEvent) => ({ className: `status-${e.status}` })}
          step={30}
          timeslots={2}
          popup
          className="calendar-full-height"
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
                  <span className="font-medium">{selectedEvent.resource?.customers?.full_name || "Neznámy klient"}</span>
                </div>
                {selectedEvent.resource?.customers?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span>{selectedEvent.resource.customers.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <LogoIcon size="sm" className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedEvent.resource?.services?.name_sk || "Bez názvu služby"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    {fmtDate(selectedEvent.start, "d. M. yyyy HH:mm")} –{" "}
                    {fmtDate(selectedEvent.end, "HH:mm")}
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
