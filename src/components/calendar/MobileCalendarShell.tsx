import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { startOfDayInTZ } from "@/lib/timezone";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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
import type { CalendarEvent, DayException, Employee, WorkingSchedule } from "./mobile/types";
import {
  BLOCK_CUSTOMER_EMAIL,
  BLOCK_SERVICE_NAME,
  getBlockedReason,
  isBlockedAppointmentNote,
  makeBlockedNote,
} from "./mobile/blocking";
import {
  buildDayExceptionsFromBusinessOverrides,
  mapAppointmentRowToCalendarAppointment,
} from "./mobile/event-mappers";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const SWIPE_THRESHOLD = 60;
const BUSINESS_TZ = "Europe/Bratislava";

const EMPLOYEE_COLOR_ORDER = ["#22c55e", "#ec4899", "#3b82f6", "#f97316", "#a855f7", "#14b8a6"];

const DAY_INDEX: Record<Tables<"schedules">["day_of_week"], number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

type ServiceOption = Pick<
  Tables<"services">,
  "id" | "name_sk" | "duration_minutes" | "price"
>;

type AppointmentQueryRow = Tables<"appointments"> & {
  services: { name_sk: string | null } | null;
  employees: { display_name: string | null } | null;
  customers: { full_name: string | null } | null;
};

export default function MobileCalendarShell() {
  const [currentDate, setCurrentDate] = useState(() =>
    startOfDayInTZ(new Date(), BUSINESS_TZ),
  );
  const [view, setView] = useState<CalendarView>("day");
  const [direction, setDirection] = useState(0);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessHours, setBusinessHours] = useState<Tables<"business_hours">[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [scheduleRows, setScheduleRows] = useState<Tables<"schedules">[]>([]);
  const [dayExceptions, setDayExceptions] = useState<DayException[]>([]);
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

    if (svcRes.error) throw svcRes.error;
    if (empRes.error) throw empRes.error;
    if (bhRes.error) throw bhRes.error;

    const mappedEmployees: Employee[] = (empRes.data ?? []).map((employee, index) => ({
      id: employee.id,
      name: employee.display_name,
      color: EMPLOYEE_COLOR_ORDER[index % EMPLOYEE_COLOR_ORDER.length],
      isActive: employee.is_active,
      orderIndex: index,
    }));

    const employeeIds = mappedEmployees.map((item) => item.id);

    const [schRes, overrideRes] = await Promise.all([
      employeeIds.length > 0
        ? supabase
            .from("schedules")
            .select("employee_id, day_of_week, start_time, end_time, created_at, id")
            .in("employee_id", employeeIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("business_date_overrides")
        .select("id, business_id, override_date, mode, start_time, end_time, label, created_at")
        .eq("business_id", DEMO_BUSINESS_ID),
    ]);

    if (schRes.error) throw schRes.error;
    if (overrideRes.error) throw overrideRes.error;

    const scheduleData = (schRes.data ?? []) as Tables<"schedules">[];
    const overrides = (overrideRes.data ?? []) as Tables<"business_date_overrides">[];

    const mappedSchedules: WorkingSchedule[] = scheduleData.map((schedule) => ({
      employeeId: schedule.employee_id,
      weekday: DAY_INDEX[schedule.day_of_week],
      start: schedule.start_time,
      end: schedule.end_time,
      breaks: [],
    }));

    setServices((svcRes.data ?? []) as ServiceOption[]);
    setEmployees(mappedEmployees);
    setBusinessHours((bhRes.data ?? []) as Tables<"business_hours">[]);
    setSchedules(mappedSchedules);
    setScheduleRows(scheduleData);
    setDayExceptions(buildDayExceptionsFromBusinessOverrides(overrides, employeeIds));
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
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { start: weekStart, end: addDays(weekEnd, 1) };
    }
    if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: weekStart, end: addDays(weekStart, 7) };
    }
    const dayStart = startOfDayInTZ(currentDate, BUSINESS_TZ);
    return { start: dayStart, end: addDays(dayStart, 1) };
  }, [currentDate, view]);

  const loadAppointments = useCallback(async () => {
    const { start, end } = getDateRange();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, start_at, end_at, status, notes, employee_id, customer_id, service_id, business_id, created_at, updated_at, services(name_sk), employees(display_name), customers(full_name)",
      )
      .eq("business_id", DEMO_BUSINESS_ID)
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .neq("status", "cancelled")
      .order("start_at");

    if (error) throw error;

    const mapped = ((data ?? []) as AppointmentQueryRow[]).map((row) =>
      mapAppointmentRowToCalendarAppointment(row),
    );

    setAppointments(mapped);
  }, [getDateRange]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStaticData(), loadAppointments()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa obnoviť kalendár";
      toast.error(message);
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
      toast.info(`Blokovaný čas: ${getBlockedReason(apt.notes)}`);
      return;
    }
    setSelectedApt(apt);
    setDetailOpen(true);
  };

  const handleSlotTap = (_employeeId: string, time: Date, isBookable: boolean) => {
    if (!isBookable) {
      toast.warning("V tomto čase nie je možné vytvoriť rezerváciu");
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
      const message = error.message || "Chyba pri vytváraní rezervácie";
      toast.error(message);
      throw error;
    }
    toast.success("Rezervácia vytvorená!");
    await loadAppointments();
  };

  const ensureBlockCustomerId = useCallback(async () => {
    if (blockCustomerIdRef.current) return blockCustomerIdRef.current;

    const { data: existing, error: existingError } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("email", BLOCK_CUSTOMER_EMAIL)
      .maybeSingle();

    if (existingError) throw existingError;
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

    if (error || !created?.id) {
      throw new Error(error?.message || "Nepodarilo sa vytvoriť interného zákazníka");
    }

    blockCustomerIdRef.current = created.id;
    return created.id;
  }, []);

  const ensureBlockServiceId = useCallback(async () => {
    if (blockServiceIdRef.current) return blockServiceIdRef.current;

    const { data: existing, error: existingError } = await supabase
      .from("services")
      .select("id")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("name_sk", BLOCK_SERVICE_NAME)
      .maybeSingle();

    if (existingError) throw existingError;
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

    if (error || !created?.id) {
      throw new Error(error?.message || "Nepodarilo sa vytvoriť internú službu");
    }

    blockServiceIdRef.current = created.id;
    return created.id;
  }, []);

  const handleBlockTimeSubmit = async (payload: {
    employee_id: string;
    start_at: string;
    end_at: string;
    reason: string;
  }) => {
    try {
      const [customerId, serviceId] = await Promise.all([
        ensureBlockCustomerId(),
        ensureBlockServiceId(),
      ]);

      const { error } = await supabase.from("appointments").insert({
        business_id: DEMO_BUSINESS_ID,
        customer_id: customerId,
        employee_id: payload.employee_id,
        service_id: serviceId,
        start_at: payload.start_at,
        end_at: payload.end_at,
        status: "confirmed",
        notes: makeBlockedNote(payload.reason),
      });

      if (error) throw error;

      toast.success("Blokovaný čas uložený");
      await loadAppointments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa uložiť blokovaný čas";
      toast.error(message);
      throw error;
    }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message || "Nepodarilo sa zrušiť rezerváciu");
      return;
    }
    toast.success("Rezervácia zrušená");
    setDetailOpen(false);
    await loadAppointments();
  };

  const handleMarkArrived = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);
    if (error) {
      toast.error(error.message || "Nepodarilo sa označiť rezerváciu");
      return;
    }
    toast.success("Označené ako prišiel");
    setDetailOpen(false);
    await loadAppointments();
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
        type:
          appointment.type === "blocked" || isBlockedAppointmentNote(appointment.notes)
            ? "blocked"
            : "reservation",
        status: appointment.status,
      })),
    [appointments],
  );

  const animKey = `${view}-${currentDate.toISOString()}`;

  return (
    <div
      className="cal-shell flex h-[100dvh] flex-col bg-background"
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
          initial={{
            x: direction === 0 ? 0 : direction > 0 ? "40%" : "-40%",
            opacity: 0,
          }}
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
              dayExceptions={dayExceptions}
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
