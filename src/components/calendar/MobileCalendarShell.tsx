import { useState, useRef, useCallback, useEffect } from "react";
import { addDays, startOfDay, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GlassHeader from "./GlassHeader";
import DayTimeline from "./DayTimeline";
import type { CalendarAppointment } from "./AppointmentBlock";
import QuickBookingSheet from "@/components/booking/QuickBookingSheet";
import AppointmentDetailSheet from "@/components/booking/AppointmentDetailSheet";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const SWIPE_THRESHOLD = 60;

export default function MobileCalendarShell() {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next
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

  // Load appointments for current date
  const loadAppointments = useCallback(async () => {
    const dayStart = startOfDay(currentDate).toISOString();
    const dayEnd = addDays(startOfDay(currentDate), 1).toISOString();

    const { data } = await supabase
      .from("appointments")
      .select(`
        id, start_at, end_at, status, notes,
        services!inner(name_sk),
        employees!inner(display_name),
        customers!inner(full_name)
      `)
      .eq("business_id", DEMO_BUSINESS_ID)
      .gte("start_at", dayStart)
      .lt("start_at", dayEnd)
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
  }, [currentDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Navigation
  const goNextDay = () => { setDirection(1); setCurrentDate((d) => addDays(d, 1)); };
  const goPrevDay = () => { setDirection(-1); setCurrentDate((d) => addDays(d, -1)); };
  const goToday = () => { setDirection(0); setCurrentDate(startOfDay(new Date())); };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only horizontal swipe (not vertical scroll)
    if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 100) {
      if (dx < 0) goNextDay();
      else goPrevDay();
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
      body: {
        business_id: DEMO_BUSINESS_ID,
        ...data,
      },
    });

    if (error) {
      toast.error("Chyba pri vytváraní rezervácie");
      throw error;
    }

    toast.success("Rezervácia vytvorená!");
    loadAppointments();
  };

  // Move appointment (drag-to-move)
  const handleMoveAppointment = async (id: string, newStart: Date) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;

    const oldStart = new Date(apt.start_at);
    const oldEnd = new Date(apt.end_at);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    const { error } = await supabase
      .from("appointments")
      .update({
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Chyba pri presúvaní");
    } else {
      toast.success("Rezervácia presunutá");
    }
    loadAppointments();
  };

  // Cancel appointment
  const handleCancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    toast.success("Rezervácia zrušená");
    setDetailOpen(false);
    loadAppointments();
  };

  // Mark arrived
  const handleMarkArrived = async (id: string) => {
    await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    toast.success("Označené ako prišiel");
    setDetailOpen(false);
    loadAppointments();
  };

  return (
    <div
      className="cal-shell flex flex-col h-[100dvh] bg-gradient-to-b from-[hsl(222,25%,8%)] via-[hsl(240,18%,10%)] to-[hsl(260,20%,8%)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <GlassHeader
        currentDate={currentDate}
        onPrevDay={goPrevDay}
        onNextDay={goNextDay}
        onToday={goToday}
      />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={currentDate.toISOString()}
          custom={direction}
          initial={{ x: direction === 0 ? 0 : direction > 0 ? "40%" : "-40%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? "-40%" : "40%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
          className="flex-1 min-h-0"
        >
          <DayTimeline
            date={currentDate}
            appointments={appointments}
            onTapSlot={handleTapSlot}
            onTapAppointment={handleTapApt}
            onMoveAppointment={handleMoveAppointment}
          />
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
