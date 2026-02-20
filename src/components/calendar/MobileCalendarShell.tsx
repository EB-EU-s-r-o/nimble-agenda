import { useState, useRef, useCallback, useEffect } from "react";
import { addDays, addWeeks, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { startOfDayInTZ } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GlassHeader from "./GlassHeader";
import DayTimeline from "./DayTimeline";
import MonthGrid from "./MonthGrid";
import WeekTimeline from "./WeekTimeline";
import type { CalendarView } from "./CalendarViewSwitcher";
import type { CalendarAppointment } from "./AppointmentBlock";
import QuickBookingSheet from "@/components/booking/QuickBookingSheet";
import AppointmentDetailSheet from "@/components/booking/AppointmentDetailSheet";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const SWIPE_THRESHOLD = 60;
const BUSINESS_TZ = "Europe/Bratislava";

export default function MobileCalendarShell() {
  const [currentDate, setCurrentDate] = useState(() => startOfDayInTZ(new Date(), BUSINESS_TZ));
  const [view, setView] = useState<CalendarView>("day");
  const [direction, setDirection] = useState(0);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Sheet states
  const [bookingOpen, setBookingOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<CalendarAppointment | null>(null);

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Load services + employees once
  useEffect(() => {
    const load = async () => {
      const [svcRes, empRes] = await Promise.all([
        supabase.from("services").select("id, name_sk, duration_minutes, price").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("name_sk"),
        supabase.from("employees").select("id, display_name").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("display_name"),
      ]);
      setServices(svcRes.data ?? []);
      setEmployees(empRes.data ?? []);
    };
    load();
  }, []);

  // Compute date range based on view
  const getDateRange = useCallback(() => {
    if (view === "month") {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      // Extend to full calendar weeks
      const ws = startOfWeek(ms, { weekStartsOn: 1 });
      const we = endOfWeek(me, { weekStartsOn: 1 });
      return { start: ws, end: addDays(we, 1) };
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: ws, end: addDays(ws, 7) };
    }
    // day
    const dayStart = startOfDayInTZ(currentDate, BUSINESS_TZ);
    return { start: dayStart, end: addDays(dayStart, 1) };
  }, [currentDate, view]);

  // Load appointments for current view range
  const loadAppointments = useCallback(async () => {
    const { start, end } = getDateRange();

    const { data } = await supabase
      .from("appointments")
      .select(`
        id, start_at, end_at, status, notes,
        services(name_sk),
        employees(display_name),
        customers(full_name)
      `)
      .eq("business_id", DEMO_BUSINESS_ID)
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .neq("status", "cancelled")
      .order("start_at");

    const mapped: CalendarAppointment[] = (data ?? []).map((a: any) => ({
      id: a.id,
      start_at: a.start_at,
      end_at: a.end_at,
      status: a.status,
      service_name: a.services?.name_sk ?? "–",
      employee_name: a.employees?.display_name ?? "–",
      customer_name: a.customers?.full_name ?? "–",
      notes: a.notes,
    }));

    setAppointments(mapped);
  }, [getDateRange]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Navigation helpers
  const navigate = useCallback((dir: number) => {
    setDirection(dir);
    setCurrentDate((d) => {
      if (view === "month") return addMonths(d, dir);
      if (view === "week") return addWeeks(d, dir);
      return addDays(d, dir);
    });
  }, [view]);

  const goToday = () => {
    setDirection(0);
    setCurrentDate(startOfDayInTZ(new Date(), BUSINESS_TZ));
  };

  // View change — drill-down from month/week to day
  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 100) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  // Slot tap
  const handleTapSlot = (time: Date) => {
    setSelectedSlotTime(time);
    setBookingOpen(true);
  };

  // Appointment tap
  const handleTapApt = (apt: CalendarAppointment) => {
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  // Booking submit
  const handleBookingSubmit = async (data: {
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
  }) => {
    const { error } = await supabase.functions.invoke("create-public-booking", {
      body: { business_id: DEMO_BUSINESS_ID, ...data },
    });
    if (error) {
      toast.error("Chyba pri vytváraní rezervácie");
      throw error;
    }
    toast.success("Rezervácia vytvorená!");
    loadAppointments();
  };

  // Move appointment
  const handleMoveAppointment = async (id: string, newStart: Date) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;
    const duration = new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    const { error } = await supabase
      .from("appointments")
      .update({ start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
      .eq("id", id);

    if (error) toast.error("Chyba pri presúvaní");
    else toast.success("Rezervácia presunutá");
    loadAppointments();
  };

  // Cancel / mark arrived
  const handleCancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    toast.success("Rezervácia zrušená");
    setDetailOpen(false);
    loadAppointments();
  };

  const handleMarkArrived = async (id: string) => {
    await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    toast.success("Označené ako prišiel");
    setDetailOpen(false);
    loadAppointments();
  };

  // Animation key changes with view + date
  const animKey = `${view}-${currentDate.toISOString()}`;

  return (
    <div
      className="cal-shell flex flex-col h-[100dvh] bg-background"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <GlassHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
      />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={animKey}
          custom={direction}
          initial={{ x: direction === 0 ? 0 : direction > 0 ? "40%" : "-40%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? "-40%" : "40%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
          className="flex-1 min-h-0"
        >
          {view === "month" && (
            <MonthGrid
              currentDate={currentDate}
              appointments={appointments}
              onDayClick={handleDayClick}
            />
          )}
          {view === "week" && (
            <WeekTimeline
              currentDate={currentDate}
              appointments={appointments}
              timezone={BUSINESS_TZ}
              onDayClick={handleDayClick}
              onTapAppointment={handleTapApt}
            />
          )}
          {view === "day" && (
            <DayTimeline
              date={currentDate}
              appointments={appointments}
              timezone={BUSINESS_TZ}
              onTapSlot={handleTapSlot}
              onTapAppointment={handleTapApt}
              onMoveAppointment={handleMoveAppointment}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <QuickBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        slotTime={selectedSlotTime}
        services={services}
        employees={employees}
        onSubmit={handleBookingSubmit}
      />

      <AppointmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        appointment={selectedApt}
        onCancel={handleCancel}
        onMarkArrived={handleMarkArrived}
      />
    </div>
  );
}
