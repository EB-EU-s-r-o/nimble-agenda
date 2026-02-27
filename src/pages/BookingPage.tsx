import { useState, useEffect, useCallback, useMemo } from "react";
import { getFirebaseFirestore } from "@/integrations/firebase/config";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { createPublicBooking } from "@/integrations/firebase/createPublicBooking";
import { getRecaptchaToken } from "@/lib/recaptcha";
import { generateSlots, getEffectiveIntervals, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { toast } from "sonner";
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore, getDaysInMonth, getDay, startOfMonth } from "date-fns";
import { sk } from "date-fns/locale";
import { z } from "zod";
import { useTheme } from "next-themes";
import { User, Mail, Phone, PenLine, ChevronLeft, ChevronRight, Star, Check, Moon, Sun, Loader2 } from "lucide-react";
import miskaImg from "@/assets/employee-miska.jpeg";
import matoImg from "@/assets/employee-mato.jpg";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

// Map employee IDs to local photos
const EMPLOYEE_PHOTOS: Record<string, string> = {
  "c1000000-0000-0000-0000-000000000001": miskaImg,
  "c1000000-0000-0000-0000-000000000002": matoImg,
};

const contactSchema = z.object({
  meno: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  priezvisko: z.string().min(2, "Priezvisko musí mať aspoň 2 znaky"),
  email: z.string().email("Neplatný email"),
  phone: z.string().optional(),
});

interface ServiceRow {
  id: string;
  name_sk: string;
  description_sk: string | null;
  price: number | null;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  business_id: string;
  category: string | null;
  subcategory: string | null;
}

interface EmployeeRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  business_id: string;
  photo_url: string | null;
  profile_id: string | null;
}

interface MembershipRow {
  profile_id: string;
  role: "owner" | "admin" | "employee" | "customer";
}

interface BookingResult {
  claim_token?: string;
  customer_email?: string;
  customer_name?: string;
}

function GoldText({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <span className={`text-primary ${className}`}>{children}</span>;
}

function StepHeader({ num, title, extra }: Readonly<{ num: string; title: string; extra?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between mt-8 mb-4">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground dark:text-background">
          {num}
        </div>
        <h2 className="text-xl font-medium tracking-wide text-foreground">{title}</h2>
      </div>
      {extra == null ? null : <div>{extra}</div>}
    </div>
  );
}

function RadioIcon({ selected }: Readonly<{ selected: boolean }>) {
  const borderClass = selected ? "border-primary" : "border-muted-foreground/40";
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${borderClass}`}>
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
    </div>
  );
}

export default function BookingPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Data states
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [business, setBusiness] = useState<{
    id: string;
    name: string;
    allow_admin_as_provider?: boolean;
    max_days_ahead?: number;
    lead_time_minutes?: number;
    opening_hours?: unknown;
  } | null>(null);
  const [businessHourEntries, setBusinessHourEntries] = useState<BusinessHourEntry[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverrideEntry[]>([]);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});
  const [employeeServiceMap, setEmployeeServiceMap] = useState<Record<string, string[]>>({});
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Booking states
  const [category, setCategory] = useState<"damske" | "panske">("damske");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    meno: "", priezvisko: "", email: "", phone: "", note: "",
    marketing: false, terms: false, all: false,
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Availability
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load initial data from Firestore (guarded so permission errors don't leave uncaught promise rejections)
  useEffect(() => {
    const load = async () => {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setInitialLoading(false);
        return;
      }
      try {
        const [bizSnap, svcSnap, empSnap, bhSnap, bdoSnap] = await Promise.all([
          getDoc(doc(firestore, "businesses", DEMO_BUSINESS_ID)),
          getDocs(query(collection(firestore, "services"), where("business_id", "==", DEMO_BUSINESS_ID), where("is_active", "==", true), orderBy("name_sk"))),
          getDocs(query(collection(firestore, "employees"), where("business_id", "==", DEMO_BUSINESS_ID), where("is_active", "==", true), orderBy("display_name"))),
          getDocs(query(collection(firestore, "business_hours"), where("business_id", "==", DEMO_BUSINESS_ID), orderBy("sort_order"))),
          getDocs(query(collection(firestore, "business_date_overrides"), where("business_id", "==", DEMO_BUSINESS_ID), where("override_date", ">=", new Date().toISOString().slice(0, 10)))),
        ]);
        if (bizSnap.exists()) {
          const d = bizSnap.data();
          setBusiness({ id: DEMO_BUSINESS_ID, name: d?.name ?? "", allow_admin_as_provider: d?.allow_admin_as_provider, max_days_ahead: d?.max_days_ahead, lead_time_minutes: d?.lead_time_minutes, opening_hours: d?.opening_hours });
        }
        setServices(svcSnap.docs.map((e) => ({ id: e.id, ...e.data() })) as unknown as ServiceRow[]);
        setEmployees(empSnap.docs.map((e) => ({ id: e.id, ...e.data() })) as unknown as EmployeeRow[]);
        setBusinessHourEntries(bhSnap.docs.map((d) => {
          const h = d.data();
          return { day_of_week: h.day_of_week, mode: h.mode, start_time: h.start_time, end_time: h.end_time };
        }));
        setDateOverrides(bdoSnap.docs.map((d) => {
          const o = d.data();
          return { override_date: o.override_date, mode: o.mode, start_time: o.start_time ?? null, end_time: o.end_time ?? null };
        }));

        const empIds = empSnap.docs.map((e) => e.id);
        if (empIds.length) {
          const schedSnap = await getDocs(query(collection(firestore, "schedules"), where("employee_id", "in", empIds.slice(0, 10))));
          const map: Record<string, EmployeeSchedule[]> = {};
          schedSnap.docs.forEach((s) => {
            const data = s.data();
            const eid = data.employee_id;
            if (!map[eid]) map[eid] = [];
            map[eid].push({ day_of_week: data.day_of_week, start_time: data.start_time, end_time: data.end_time });
          });
          setSchedules(map);
        }

        const esSnap = await getDocs(query(collection(firestore, "employee_services"), where("business_id", "==", DEMO_BUSINESS_ID)));
        const eMap: Record<string, string[]> = {};
        esSnap.docs.forEach((d) => {
          const item = d.data();
          const eid = item.employee_id;
          if (!eMap[eid]) eMap[eid] = [];
          eMap[eid].push(item.service_id);
        });
        setEmployeeServiceMap(eMap);

        try {
          const memSnap = await getDocs(query(collection(firestore, "memberships"), where("business_id", "==", DEMO_BUSINESS_ID)));
          setMemberships(memSnap.docs.map((d) => ({ profile_id: d.data().profile_id, role: d.data().role })) as MembershipRow[]);
        } catch (membershipsError_) {
          console.warn("BookingPage: memberships read skipped (e.g. unauthenticated)", membershipsError_);
          setMemberships([]);
        }
      } catch (error_) {
        console.warn("BookingPage: failed to load Firestore data", error_);
        setServices([]);
        setEmployees([]);
        setBusinessHourEntries([]);
        setDateOverrides([]);
        setSchedules({});
        setEmployeeServiceMap({});
        setMemberships([]);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, []);

  // Derived: grouped subcategories
  const subcategories = useMemo(() => {
    const cats = services
      .filter((s): s is typeof s & { subcategory: string } => s.category === category && Boolean(s.subcategory))
      .map((s) => s.subcategory);
    return [...new Set(cats)].sort((a, b) => a.localeCompare(b));
  }, [services, category]);

  // Derived: filtered services for selected subcategory
  const filteredServices = useMemo(() => {
    if (!subcategory) return [];
    return services.filter((s) => s.category === category && s.subcategory === subcategory);
  }, [services, category, subcategory]);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  // Filter employees based on selected service and admin setting
  const filteredEmployees = useMemo(() => {
    let result = employees;

    // Filter by service assignment
    if (selectedServiceId) {
      result = result.filter(emp => {
        if (!employeeServiceMap[emp.id]) return true;
        return employeeServiceMap[emp.id].includes(selectedServiceId);
      });
    }

    // Filter admins/owners based on allow_admin_as_provider setting
    if (!business?.allow_admin_as_provider) {
      result = result.filter(emp => {
        // If no profile_id, employee is not linked to a user - always allow
        if (!emp.profile_id) return true;
        // Find membership for this employee's profile
        const membership = memberships.find(m => m.profile_id === emp.profile_id);
        // If no membership, allow (legacy employee)
        if (!membership) return true;
        // Allow only employees (not admin/owner) when setting is false
        return membership.role === "employee";
      });
    }

    return result;
  }, [employees, selectedServiceId, employeeServiceMap, business, memberships]);

  const selectedEmployee = employees.find((e) => e.id === selectedWorkerId) ?? null;

  // Calendar helpers
  const today = startOfDay(new Date());
  const maxDays = business?.max_days_ahead ?? 60;
  const monthStart = startOfMonth(calendarMonth);
  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDayOffset = (getDay(monthStart) + 6) % 7; // Monday-first

  // Build actual Date for selected calendar day
  const selectedFullDate = useMemo(() => {
    if (!selectedDate) return null;
    return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), selectedDate);
  }, [selectedDate, calendarMonth]);

  // Check if employee available on a day
  const isEmployeeAvailableOnDay = useCallback((empId: string, date: Date) => {
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
    return (schedules[empId] ?? []).some((s) => s.day_of_week === dayName);
  }, [schedules]);

  // Check if business is open on a day
  const isBusinessOpenOnDay = useCallback((date: Date) => {
    const intervals = getEffectiveIntervals(
      date,
      businessHourEntries,
      dateOverrides,
      business?.opening_hours as BusinessHours | undefined
    );
    return !!(intervals && intervals.length > 0);
  }, [businessHourEntries, dateOverrides, business]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedFullDate || !selectedEmployee || !selectedService || !business) {
      setAvailableSlots([]);
      return;
    }
    const loadSlots = async () => {
      setLoadingSlots(true);
      const dayStart = startOfDay(selectedFullDate);
      const dayEnd = addDays(dayStart, 1);

      const firestore = getFirebaseFirestore();
      let existing: { start_at: string; end_at: string }[] = [];
      if (firestore) {
        const apptSnap = await getDocs(
          query(
            collection(firestore, "appointments"),
            where("employee_id", "==", selectedEmployee.id),
            where("start_at", ">=", dayStart.toISOString()),
            where("start_at", "<", dayEnd.toISOString())
          )
        );
        existing = apptSnap.docs
          .filter((d) => d.data().status !== "cancelled")
          .map((d) => ({ start_at: d.data().start_at, end_at: d.data().end_at }));
      }

      const slots = generateSlots({
        date: selectedFullDate,
        serviceDuration: selectedService.duration_minutes,
        serviceBuffer: selectedService.buffer_minutes ?? 0,
        openingHours: (business.opening_hours ?? {}) as BusinessHours,
        businessHourEntries: businessHourEntries.length ? businessHourEntries : undefined,
        dateOverrides: dateOverrides.length ? dateOverrides : undefined,
        employeeSchedules: schedules[selectedEmployee.id] ?? [],
        existingAppointments: (existing ?? []) as ExistingAppointment[],
        leadTimeMinutes: business.lead_time_minutes ?? 60,
      });

      setAvailableSlots(slots);
      setLoadingSlots(false);
    };
    loadSlots();
  }, [selectedFullDate, selectedEmployee, selectedService, business, schedules, businessHourEntries, dateOverrides]);

  // Group available slots
  const timeGroups = useMemo(() => {
    const dopoludnia: string[] = [];
    const popoludni: string[] = [];
    availableSlots.forEach((slot) => {
      const t = format(slot, "HH:mm");
      if (slot.getHours() < 12) dopoludnia.push(t);
      else popoludni.push(t);
    });
    return { dopoludnia, popoludni };
  }, [availableSlots]);

  // Consent handlers
  const handleCheckAll = () => {
    const newValue = !formData.all;
    setFormData({ ...formData, all: newValue, marketing: newValue, terms: newValue });
  };
  const handleConsentChange = (field: "marketing" | "terms") => {
    const newData = { ...formData, [field]: !formData[field] };
    newData.all = newData.marketing && newData.terms;
    setFormData(newData);
  };

  // Submit booking
  const handleSubmit = async () => {
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setContactErrors(errs);
      return;
    }
    if (!formData.terms) {
      toast.error("Musíte súhlasiť s obchodnými podmienkami");
      return;
    }
    setContactErrors({});
    setSubmitting(true);

    // Find the actual slot Date
    const slotDate = availableSlots.find((s) => format(s, "HH:mm") === selectedTime);
    if (!slotDate) {
      toast.error("Vybraný čas už nie je dostupný");
      setSubmitting(false);
      return;
    }

    try {
      const serviceId = selectedServiceId ?? null;
      const workerId = selectedWorkerId ?? null;
      if (!serviceId || !workerId) {
        setSubmitting(false);
        return;
      }
      const recaptchaToken = await getRecaptchaToken("booking");
      const data = await createPublicBooking({
        business_id: DEMO_BUSINESS_ID,
        service_id: serviceId,
        employee_id: workerId,
        start_at: slotDate.toISOString(),
        customer_name: `${formData.meno} ${formData.priezvisko}`.trim(),
        customer_email: formData.email,
        customer_phone: formData.phone || undefined,
        recaptcha_token: recaptchaToken ?? undefined,
      });

      if (data.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      setBookingResult(data);
      setBookingDone(true);
      toast.success("Rezervácia úspešne vytvorená!");
    } catch {
      toast.error("Chyba pri komunikácii so serverom");
    }
    setSubmitting(false);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingDone && bookingResult) {
    return (
      <div className="min-h-screen bg-background" data-testid="booking-success">
        <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-background/90 border-b border-border backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-widest uppercase font-serif text-foreground">
              PAPI <GoldText>HAIR</GoldText> DESIGN
            </span>
          </div>
        </header>
        <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Rezervácia potvrdená!</h2>
          <p className="text-muted-foreground text-sm">
            Vaša rezervácia bola úspešne vytvorená. Potvrdenie vám príde na email.
          </p>
          <div className="rounded-2xl border border-border bg-card p-4 text-left space-y-2 text-sm">
            <p><strong className="text-foreground">Služba:</strong> <span className="text-muted-foreground">{selectedService?.name_sk}</span></p>
            <p><strong className="text-foreground">Zamestnanec:</strong> <span className="text-muted-foreground">{selectedEmployee?.display_name}</span></p>
            <p><strong className="text-foreground">Dátum:</strong> <span className="text-muted-foreground">{selectedFullDate && format(selectedFullDate, "d. MMMM yyyy", { locale: sk })}</span></p>
            <p><strong className="text-foreground">Čas:</strong> <span className="text-muted-foreground">{selectedTime}</span></p>
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem("claim_token", bookingResult.claim_token);
              globalThis.location.href = `/auth?mode=register&email=${encodeURIComponent(bookingResult.customer_email)}&name=${encodeURIComponent(bookingResult.customer_name)}`;
            }}
            className="w-full font-bold py-4 rounded-full text-lg bg-primary text-primary-foreground dark:text-background hover:bg-primary/90 transition-all"
          >
            Dokonči registráciu
          </button>
          <button
            onClick={() => globalThis.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Nová rezervácia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] font-sans pb-24 max-w-md w-full mx-auto shadow-2xl relative overflow-x-hidden transition-colors duration-300 bg-background text-foreground safe-x" data-testid="booking-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 safe-x flex items-center justify-between bg-background/90 border-b border-border backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-widest uppercase font-serif">
            PAPI <GoldText>HAIR</GoldText> DESIGN
          </span>
          <span className="text-xs text-muted-foreground">papihairdesign.sk</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            {isDark ? <Sun size={20} className="text-primary" /> : <Moon size={20} className="text-foreground" />}
          </button>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-border">
            <div className="w-full h-1/3 bg-white" />
            <div className="w-full h-1/3 bg-blue-600" />
            <div className="w-full h-1/3 bg-red-600" />
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* Step 1: Kategória */}
        <StepHeader num="1" title="Vyberte kategóriu" extra={
          <div className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium border border-primary text-primary">
            4.9 <Star size={14} className="fill-primary" />
          </div>
        } />

        <div className="flex flex-col gap-3" data-testid="booking-step-category">
          {(["damske", "panske"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setSubcategory(null); setSelectedServiceId(null); setSelectedWorkerId(null); setSelectedDate(null); setSelectedTime(null); }}
              className={`w-full py-3.5 rounded-full font-medium text-lg transition-all ${category === cat
                ? "bg-primary text-primary-foreground dark:text-background shadow-lg shadow-primary/20"
                : "bg-card text-muted-foreground border border-border"
                }`}
            >
              {cat === "damske" ? "Dámske Služby" : "Pánske Služby"}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => { setSubcategory(sub); setSelectedServiceId(null); }}
              className={`w-full py-3.5 rounded-full border transition-all duration-200 text-sm font-medium uppercase tracking-wider ${subcategory === sub
                ? "border-primary bg-card text-primary"
                : "border-border text-muted-foreground bg-card hover:border-muted-foreground/50"
                }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Step 2: Služba */}
        {subcategory && filteredServices.length > 0 && (
          <div className="animate-fade-in">
            <StepHeader num="2" title="Vyberte službu" />
            <div className="flex flex-col gap-3">
              {filteredServices.map((srv) => (
                <button
                  type="button"
                  key={srv.id}
                  onClick={() => setSelectedServiceId(srv.id)}
                  className={`w-full text-left border rounded-[2rem] p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 ${selectedServiceId === srv.id
                    ? "border-primary bg-card"
                    : "border-border bg-card"
                    }`}
                >
                  <RadioIcon selected={selectedServiceId === srv.id} />
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-sm text-foreground">{srv.name_sk}</span>
                    <span className="text-sm text-muted-foreground">
                      {srv.duration_minutes} min
                      {srv.price != null && (
                        <> – <GoldText className="font-medium">{srv.price} €</GoldText></>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Pracovník */}
        {selectedServiceId && (
          <div className="animate-fade-in" data-testid="booking-step-employee">
            <StepHeader num="3" title="Vyberte pracovníka" />
            <div className="flex flex-col gap-4">
              {filteredEmployees.map((w) => (
                <button
                  type="button"
                  key={w.id}
                  onClick={() => { setSelectedWorkerId(w.id); setSelectedDate(null); setSelectedTime(null); }}
                  className={`w-full text-left border rounded-[2rem] p-2 flex items-center gap-4 cursor-pointer transition-all duration-200 ${selectedWorkerId === w.id
                    ? "border-primary bg-card"
                    : "border-border bg-card"
                    }`}
                >
                  <div className="pl-2"><RadioIcon selected={selectedWorkerId === w.id} /></div>
                  <div className="flex w-full h-24 rounded-2xl overflow-hidden border border-primary/30">
                    <div className="w-1/3 h-full relative">
                      <img
                        src={EMPLOYEE_PHOTOS[w.id] || w.photo_url || ""}
                        alt={w.display_name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-2/3 flex items-center justify-center bg-background dark:bg-card">
                      <span className="font-bold text-lg tracking-wide text-primary">{w.display_name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Dátum */}
        {selectedWorkerId && (
          <div className="animate-fade-in">
            <StepHeader num="4" title="Vyberte dátum" />
            <div className="rounded-xl p-4 border border-border bg-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg ml-2 text-foreground">
                  {format(calendarMonth, "LLLL yyyy", { locale: sk })}
                </h3>
                <div className="flex rounded-full overflow-hidden border border-border">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="p-2 px-4 bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="p-2 px-4 bg-primary text-primary-foreground dark:text-background hover:bg-primary/80 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-4 text-center mb-2">
                {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                  <div key={d} className="font-medium text-sm text-muted-foreground">{d}</div>
                ))}

                {Array.from({ length: firstDayOffset }, (_, i) => <div key={`empty-${calendarMonth.getTime()}-${i}`} className="py-1" />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                  const isPast = isBefore(dayDate, today);
                  const isTooFar = isAfter(dayDate, addDays(today, maxDays));
                  const isClosed = !isBusinessOpenOnDay(dayDate);
                  const empAvailable = selectedWorkerId ? isEmployeeAvailableOnDay(selectedWorkerId, dayDate) : false;
                  const disabled = isPast || isTooFar || isClosed || !empAvailable;
                  const isSelected = selectedDate === day && isSameDay(dayDate, selectedFullDate ?? new Date(0));
                  const isToday = isSameDay(dayDate, today);
                  let dayBtnClass = "text-foreground hover:bg-accent";
                  if (isSelected) dayBtnClass = "bg-primary text-primary-foreground dark:text-background font-bold shadow-md";
                  else if (isToday) dayBtnClass = "border border-muted-foreground/40 text-foreground";
                  else if (isPast || isTooFar) dayBtnClass = "text-muted-foreground/20 cursor-not-allowed";
                  else if (isClosed) dayBtnClass = "bg-muted/40 text-muted-foreground/30 cursor-not-allowed";
                  else if (!empAvailable) dayBtnClass = "text-muted-foreground/20 cursor-not-allowed";

                  return (
                    <div key={day} className="flex justify-center">
                      <button
                        onClick={() => { if (!disabled) { setSelectedDate(day); setSelectedTime(null); } }}
                        disabled={disabled}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${dayBtnClass}`}
                      >
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Čas */}
        {Boolean(selectedDate) && (
          <div className="animate-fade-in">
            <StepHeader num="5" title="Vyberte čas" />
            {(() => {
              if (loadingSlots) {
                return (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                );
              }
              if (availableSlots.length === 0) {
                return <p className="text-center text-muted-foreground py-4">Žiadne dostupné termíny v tento deň</p>;
              }
              return (
              <>
                {timeGroups.dopoludnia.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Dopoludnia</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-3">
                      {timeGroups.dopoludnia.map((t) => {
                        const isSelected = selectedTime === t;
                        const timeBtnClass = isSelected
                          ? "bg-primary text-primary-foreground dark:text-background border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/50";
                        return (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`text-base px-4 py-2 rounded-full transition-all font-medium border ${timeBtnClass}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {timeGroups.popoludni.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-muted-foreground">Popoludní</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-3">
                      {timeGroups.popoludni.map((t) => {
                        const isSelected = selectedTime === t;
                        const timeBtnClass = isSelected
                          ? "bg-primary text-primary-foreground dark:text-background border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/50";
                        return (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`text-base px-4 py-2 rounded-full transition-all font-medium border ${timeBtnClass}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
            })()}
          </div>
        )}

        {/* Step 6: Údaje */}
        {selectedTime && (
          <div className="animate-fade-in pb-10" data-testid="booking-step-details">
            <StepHeader num="6" title="Vyplňte Vaše údaje" />

            <div className="flex flex-col gap-4 mb-6">
              {[
                { icon: User, placeholder: "Meno", field: "meno" as const, type: "text" },
                { icon: User, placeholder: "Priezvisko", field: "priezvisko" as const, type: "text" },
                { icon: Mail, placeholder: "Email", field: "email" as const, type: "email" },
              ].map((input) => (
                <div key={input.field}>
                  <div className={`flex border rounded-full overflow-hidden transition-colors border-border focus-within:border-primary`}>
                    <div className="w-12 flex items-center justify-center bg-muted text-primary">
                      <input.icon size={18} />
                    </div>
                    <input
                      type={input.type}
                      placeholder={input.placeholder}
                      className="flex-1 py-3 px-4 outline-none bg-card text-foreground placeholder:text-muted-foreground"
                      value={formData[input.field]}
                      onChange={(e) => setFormData({ ...formData, [input.field]: e.target.value })}
                    />
                  </div>
                  {contactErrors[input.field] && (
                    <p className="text-destructive text-xs mt-1 ml-4">{contactErrors[input.field]}</p>
                  )}
                </div>
              ))}

              {/* Telefón */}
              <div className="flex border rounded-full overflow-hidden transition-colors border-border focus-within:border-primary">
                <div className="w-12 flex items-center justify-center bg-muted text-primary">
                  <Phone size={18} />
                </div>
                <div className="flex items-center px-3 border-r border-border bg-card">
                  <div className="w-4 h-3 rounded-sm overflow-hidden flex flex-col border border-muted-foreground/30">
                    <div className="h-1/3 bg-white w-full" />
                    <div className="h-1/3 bg-blue-600 w-full" />
                    <div className="h-1/3 bg-red-600 w-full" />
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">+421</span>
                </div>
                <input
                  type="tel"
                  className="flex-1 py-3 px-4 outline-none bg-card text-foreground"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Poznámka */}
              <div className="flex border rounded-3xl overflow-hidden transition-colors min-h-[100px] border-border focus-within:border-primary">
                <div className="w-12 flex items-start justify-center pt-4 bg-muted text-primary">
                  <PenLine size={18} />
                </div>
                <textarea
                  placeholder="Poznámka"
                  className="flex-1 py-3 px-4 outline-none resize-none bg-card text-foreground placeholder:text-muted-foreground"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </div>

            {/* Consents */}
            <div className="flex flex-col gap-4 text-sm mb-8 text-muted-foreground">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.all}
                  onChange={() => handleCheckAll()}
                  className="sr-only"
                  aria-label="Označiť všetky možnosti"
                />
                <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.all
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                  }`}>
                  {formData.all && <Check size={14} className="text-primary-foreground dark:text-background" />}
                </div>
                <span className="font-medium text-foreground">Označiť všetky možnosti</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.marketing}
                  onChange={() => handleConsentChange("marketing")}
                  className="sr-only"
                  aria-label="Súhlas s marketingom"
                />
                <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.marketing
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                  }`}>
                  {formData.marketing && <Check size={14} className="text-primary-foreground dark:text-background" />}
                </div>
                <div className="leading-snug">
                  Súhlasím so spracovaním osobných údajov pre <strong className="text-foreground">Papi Hair Design</strong> na marketingové účely{" "}
                  <span className="text-primary cursor-pointer hover:underline">Podrobnosti tu</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.terms}
                  onChange={() => handleConsentChange("terms")}
                  className="sr-only"
                  aria-label="Súhlas s obchodnými podmienkami"
                />
                <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${formData.terms
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 bg-transparent group-hover:border-primary"
                  }`}>
                  {formData.terms && <Check size={14} className="text-primary-foreground dark:text-background" />}
                </div>
                <div>
                  Súhlasím so <span className="text-primary cursor-pointer hover:underline">všeobecnými obchodnými podmienkami</span>
                </div>
              </label>

              <div className="text-right text-primary text-sm mt-2 cursor-pointer hover:underline">
                Zásady ochrany osobných údajov
              </div>
            </div>

            {/* Summary */}
            {selectedService && selectedFullDate && (
              <div className="text-center text-sm font-medium mb-6 text-foreground">
                Váš termín: <strong className="text-primary">{selectedService.name_sk}</strong> u <strong className="text-primary">{selectedEmployee?.display_name}</strong>
                {" "}dňa <strong className="text-primary">{format(selectedFullDate, "d. MMMM", { locale: sk })}</strong> o <strong className="text-primary">{selectedTime}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full font-bold py-4 rounded-full text-lg transition-all transform active:scale-[0.98] bg-primary text-primary-foreground dark:text-background hover:bg-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50"
              data-testid="booking-submit"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "REZERVOVAŤ ONLINE"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
