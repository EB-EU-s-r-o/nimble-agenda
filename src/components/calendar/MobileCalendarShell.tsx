import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { addDays, addWeeks, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { startOfDayInTZ } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GlassHeader from "./GlassHeader";
import MonthGrid from "./MonthGrid";
import WeekTimeline from "./WeekTimeline";
import type { CalendarView } from "./CalendarViewSwitcher";
import type { CalendarAppointment } from "./AppointmentBlock";
import QuickBookingSheet from "@/components/booking/QuickBookingSheet";
import AppointmentDetailSheet from "@/components/booking/AppointmentDetailSheet";
import BlockTimeSheet from "@/components/booking/BlockTimeSheet";
import EmployeeFilter from "./mobile/EmployeeFilter";
import CalendarToolbar from "./mobile/CalendarToolbar";
import CalendarGrid from "./mobile/CalendarGrid";
import type { CalendarEvent, Employee, WorkingSchedule } from "./mobile/types";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const SWIPE_THRESHOLD = 60;
const BUSINESS_TZ = "Europe/Bratislava";
const BLOCK_TAG = "[BLOCK]";
const BLOCK_CUSTOMER_EMAIL = "internal-block@nimble.local";
const BLOCK_SERVICE_NAME = "Blokovaný čas";

const EMPLOYEE_COLOR_ORDER = ["#22c55e", "#ec4899", "#3b82f6", "#f97316", "#a855f7", "#14b8a6"];

type SupabaseAppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  employee_id: string;
  services?: { name_sk?: string | null } | null;
  employees?: { display_name?: string | null } | null;
  customers?: { full_name?: string | null } | null;
};

const isBlockedAppointment = (notes?: string | null) => Boolean(notes?.startsWith(BLOCK_TAG));
const blockedReason = (notes?: string | null) => notes?.replace(BLOCK_TAG, "").trim() || BLOCK_SERVICE_NAME;

export default function MobileCalendarShell() {
  const [currentDate, setCurrentDate] = useState(() => startOfDayInTZ(new Date(), BUSINESS_TZ));
  const [view, setView] = useState<CalendarView>("day");
  const [direction, setDirection] = useState(0);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [scheduleRows, setScheduleRows] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [blockTimeOpen, setBlockTimeOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<CalendarAppointment | null>(null);

  const blockCustomerIdRef = useRef<string | null>(null);
  const blockServiceIdRef = useRef<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const loadStaticData = useCallback(async () => {
    const [svcRes, empRes, bhRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, name_sk, duration_minutes, price")
        .eq("business_id", DEMO_BUSINESS_ID)
        .eq("is_active", true)
        .order("name_sk"),
      supabase
        .from("employees")
        .select("id, display_name, is_active, created_at")
        .eq("business_id", DEMO_BUSINESS_ID)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_hours")
        .select("day_of_week, mode, start_time, end_time")
        .eq("business_id", DEMO_BUSINESS_ID)
        .order("sort_order"),
    ]);

    const mappedEmployees = (empRes.data ?? []).map((employee: any, index: number) => ({
      id: employee.id,
      name: employee.display_name,
      color: EMPLOYEE_COLOR_ORDER[index % EMPLOYEE_COLOR_ORDER.length],
      isActive: employee.is_active,
      orderIndex: index,
    }));

    const empIds = mappedEmployees.map((item) => item.id);
    const schRes = empIds.length > 0
      ? await supabase
          .from("schedules")
          .select("employee_id, day_of_week, start_time, end_time")
          .in("employee_id", empIds)
      : { data: [] as any[] };

    setScheduleRows(schRes.data ?? []);

    const mappedSchedules: WorkingSchedule[] = (schRes.data ?? []).map((schedule: any) => ({
      employeeId: schedule.employee_id,
      weekday: Number(schedule.day_of_week),
      start: schedule.start_time,
      end: schedule.end_time,
      breaks: [],
    }));

    setServices(svcRes.data ?? []);
    setEmployees(mappedEmployees);
    setBusinessHours(bhRes.data ?? []);
    setSchedules(mappedSchedules);
    setSelectedEmployeeIds((prev) => {
      if (prev.length > 0) {
        return mappedEmployees
          .filter((employee) => prev.includes(employee.id))
          .map((employee) => employee.id);
      }
      return mappedEmployees.map((employee) => employee.id);
    });
  }, []);

  const getDateRange = useCallback(() => {
    if (view === "month") {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      const ws = startOfWeek(ms, { weekStartsOn: 1 });
      const we = endOfWeek(me, { weekStartsOn: 1 });
      return { start: ws, end: addDays(we, 1) };
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: ws, end: addDays(ws, 7) };
    }
    const dayStart = startOfDayInTZ(currentDate, BUSINESS_TZ);
    return { start: dayStart, end: addDays(dayStart, 1) };
  }, [currentDate, view]);

  const loadAppointments = useCallback(async () => {
    const { start, end } = getDateRange();
    const { data } = await supabase
      .from("appointments")
      .select(`
        id, start_at, end_at, status, notes, employee_id,
        services(name_sk),
        employees(display_name),
        customers(full_name)
      `)
      .eq("business_id", DEMO_BUSINESS_ID)
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .neq("status", "cancelled")
      .order("start_at");

    const mapped: CalendarAppointment[] = ((data ?? []) as SupabaseAppointmentRow[]).map((appointment) => {
      const blocked = isBlockedAppointment(appointment.notes);
      const title = blocked ? blockedReason(appointment.notes) : appointment.services?.name_sk ?? "–";

      return {
        id: appointment.id,
        start_at: appointment.start_at,
        end_at: appointment.end_at,
        status: appointment.status,
        service_name: title,
        employee_name: appointment.employees?.display_name ?? "–",
        customer_name: blocked ? "Interné" : appointment.customers?.full_name ?? "–",
        employee_id: appointment.employee_id,
        type: blocked ? "blocked" : "reservation",
        notes: appointment.notes,
      };
    });

    setAppointments(mapped);
  }, [getDateRange]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStaticData(), loadAppointments()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAppointments, loadStaticData]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const navigate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrentDate((d) => {
        if (view === "month") return addMonths(d, dir);
        if (view === "week") return addWeeks(d, dir);
        return addDays(d, dir);
      });
    },
    [view],
  );

  const goToday = () => {
    setDirection(0);
    setCurrentDate(startOfDayInTZ(new Date(), BUSINESS_TZ));
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 100) navigate(dx < 0 ? 1 : -1);
  };

  const handleTapApt = (apt: CalendarAppointment) => {
    if (apt.type === "blocked") {
      toast.info(`Blokovaný čas: ${blockedReason(apt.notes)}`);
      return;
    }
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const handleSlotTap = (_employeeId: string, time: Date, isWorking: boolean) => {
    if (!isWorking) {
      toast.warning("Zamestnanec v tomto čase nepracuje");
      return;
    }
    setSelectedSlotTime(time);
    setBookingOpen(true);
  };

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

  const ensureBlockCustomerId = useCallback(async () => {
    if (blockCustomerIdRef.current) return blockCustomerIdRef.current;

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("email", BLOCK_CUSTOMER_EMAIL)
      .maybeSingle();

    if (existing?.id) {
      blockCustomerIdRef.current = existing.id;
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        business_id: DEMO_BUSINESS_ID,
        full_name: BLOCK_SERVICE_NAME,
        email: BLOCK_CUSTOMER_EMAIL,
      })
      .select("id")
      .single();

    if (error || !created?.id) throw new Error("Nepodarilo sa vytvoriť interného zákazníka pre blokovanie času");
    blockCustomerIdRef.current = created.id;
    return created.id;
  }, []);

  const ensureBlockServiceId = useCallback(async () => {
    if (blockServiceIdRef.current) return blockServiceIdRef.current;

    const { data: existing } = await supabase
      .from("services")
      .select("id")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("name_sk", BLOCK_SERVICE_NAME)
      .maybeSingle();

    if (existing?.id) {
      blockServiceIdRef.current = existing.id;
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("services")
      .insert({
        business_id: DEMO_BUSINESS_ID,
        name_sk: BLOCK_SERVICE_NAME,
        duration_minutes: 30,
        price: 0,
        category: "interné",
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !created?.id) throw new Error("Nepodarilo sa vytvoriť internú službu pre blokovanie času");
    blockServiceIdRef.current = created.id;
    return created.id;
  }, []);

  const handleBlockTimeSubmit = async (payload: { employee_id: string; start_at: string; end_at: string; reason: string }) => {
    try {
      const [customerId, serviceId] = await Promise.all([ensureBlockCustomerId(), ensureBlockServiceId()]);
      const { error } = await supabase.from("appointments").insert({
        business_id: DEMO_BUSINESS_ID,
        customer_id: customerId,
        employee_id: payload.employee_id,
        service_id: serviceId,
        start_at: payload.start_at,
        end_at: payload.end_at,
        status: "confirmed",
        notes: `${BLOCK_TAG} ${payload.reason}`,
      });
      if (error) throw error;
      toast.success("Blokovaný čas uložený");
      await loadAppointments();
    } catch (error) {
      console.error(error);
      toast.error("Nepodarilo sa uložiť blokovaný čas");
      throw error;
    }
  };

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

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    );
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployeeIds((prev) =>
      prev.length === employees.length ? [] : employees.map((employee) => employee.id),
    );
  };

  const dayEvents: CalendarEvent[] = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        employeeId: appointment.employee_id ?? "",
        start: appointment.start_at,
        end: appointment.end_at,
        title: appointment.service_name,
        clientName: appointment.customer_name,
        serviceName: appointment.service_name,
        type: appointment.type === "blocked" ? "blocked" : "reservation",
        status: appointment.status,
      })),
    [appointments],
  );

  const animKey = `${view}-${currentDate.toISOString()}`;

  return (
    <div className="cal-shell flex h-[100dvh] flex-col bg-background" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <GlassHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={goToday}
      />

      <EmployeeFilter
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        onToggle={toggleEmployee}
        onSelectAll={handleSelectAllEmployees}
      />

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        onAddReservation={() => {
          setSelectedSlotTime(new Date());
          setBookingOpen(true);
        }}
        onBlockTime={() => setBlockTimeOpen(true)}
        onRefresh={refreshData}
        onToday={goToday}
        refreshing={refreshing}
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
              businessHours={businessHours}
              schedules={scheduleRows}
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
            <CalendarGrid
              date={currentDate}
              employees={employees}
              selectedEmployeeIds={selectedEmployeeIds}
              events={dayEvents.filter((event) => selectedEmployeeIds.includes(event.employeeId))}
              schedules={schedules}
              dayExceptions={[]}
              timezone={BUSINESS_TZ}
              onSlotClick={handleSlotTap}
              onEventClick={(event) => {
                const apt = appointments.find((item) => item.id === event.id);
                if (apt) handleTapApt(apt);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <QuickBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        slotTime={selectedSlotTime}
        services={services}
        employees={employees
          .filter((employee) => selectedEmployeeIds.includes(employee.id))
          .map((employee) => ({ id: employee.id, display_name: employee.name }))}
        onSubmit={handleBookingSubmit}
      />

      <BlockTimeSheet
        open={blockTimeOpen}
        onOpenChange={setBlockTimeOpen}
        date={currentDate}
        employees={employees.map((employee) => ({ id: employee.id, display_name: employee.name }))}
        onSubmit={handleBlockTimeSubmit}
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
