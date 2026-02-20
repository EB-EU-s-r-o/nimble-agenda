import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateSlots, type BusinessHours, type EmployeeSchedule, type ExistingAppointment, type BusinessHourEntry, type DateOverrideEntry } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Scissors, ChevronLeft, ChevronRight, Loader2, Check, Calendar, Clock, User } from "lucide-react";
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore } from "date-fns";
import { sk } from "date-fns/locale";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useBusinessInfo } from "@/hooks/useBusinessInfo";
import { BusinessInfoPanel } from "@/components/booking/BusinessInfoPanel";

const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const contactSchema = z.object({
  name: z.string().min(2, "Meno musí mať aspoň 2 znaky"),
  email: z.string().email("Neplatný email"),
  phone: z.string().optional(),
});

type Step = "service" | "employee" | "date" | "time" | "contact" | "confirm" | "done";

export default function BookingPage() {
  const [step, setStep] = useState<Step>("service");
  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [businessHourEntries, setBusinessHourEntries] = useState<BusinessHourEntry[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverrideEntry[]>([]);
  const { info: businessInfo, openStatus, nextOpening } = useBusinessInfo(DEMO_BUSINESS_ID);
  const [schedules, setSchedules] = useState<Record<string, EmployeeSchedule[]>>({});

  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      const [bizRes, svcRes, empRes, bhRes, bdoRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", DEMO_BUSINESS_ID).maybeSingle(),
        supabase.from("services").select("*").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("name_sk"),
        supabase.from("employees").select("*").eq("business_id", DEMO_BUSINESS_ID).eq("is_active", true).order("display_name"),
        supabase.from("business_hours").select("*").eq("business_id", DEMO_BUSINESS_ID).order("sort_order"),
        supabase.from("business_date_overrides").select("*").eq("business_id", DEMO_BUSINESS_ID).gte("override_date", new Date().toISOString().slice(0, 10)),
      ]);
      setBusiness(bizRes.data);
      setServices(svcRes.data ?? []);
      setEmployees(empRes.data ?? []);
      setBusinessHourEntries((bhRes.data ?? []).map((h: any) => ({
        day_of_week: h.day_of_week,
        mode: h.mode,
        start_time: h.start_time,
        end_time: h.end_time,
      })));
      setDateOverrides((bdoRes.data ?? []).map((o: any) => ({
        override_date: o.override_date,
        mode: o.mode,
        start_time: o.start_time,
        end_time: o.end_time,
      })));

      // Load all schedules
      const empIds = (empRes.data ?? []).map((e: any) => e.id);
      if (empIds.length) {
        const { data: scheds } = await supabase.from("schedules").select("*").in("employee_id", empIds);
        const map: Record<string, EmployeeSchedule[]> = {};
        (scheds ?? []).forEach((s: any) => {
          if (!map[s.employee_id]) map[s.employee_id] = [];
          map[s.employee_id].push(s);
        });
        setSchedules(map);
      }
    };
    load();
  }, []);

  // Generate available dates (next N days where employee works)
  const maxDays = business?.max_days_ahead ?? 60;
  const today = startOfDay(new Date());
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // Load slots when date+employee+service selected
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !selectedEmployee || !selectedService || !business) return;
    setLoadingSlots(true);

    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    const { data: existing } = await supabase
      .from("appointments")
      .select("start_at, end_at")
      .eq("employee_id", selectedEmployee.id)
      .gte("start_at", dayStart.toISOString())
      .lt("start_at", dayEnd.toISOString())
      .neq("status", "cancelled");

    const slots = generateSlots({
      date: selectedDate,
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
  }, [selectedDate, selectedEmployee, selectedService, business, schedules, businessHourEntries, dateOverrides]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleSubmit = async () => {
    const result = contactSchema.safeParse(contact);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setContactErrors(errs);
      return;
    }
    setContactErrors({});
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-public-booking", {
        body: {
          business_id: DEMO_BUSINESS_ID,
          service_id: selectedService.id,
          employee_id: selectedEmployee.id,
          start_at: selectedSlot!.toISOString(),
          customer_name: contact.name,
          customer_email: contact.email,
          customer_phone: contact.phone,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error ?? "Chyba pri vytváraní rezervácie");
        setSubmitting(false);
        return;
      }

      setBookingResult(data);
      setStep("done");
    } catch {
      toast.error("Chyba pri komunikácii so serverom");
    }
    setSubmitting(false);
  };

  const goBack = () => {
    const order: Step[] = ["service", "employee", "date", "time", "contact", "confirm"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const isEmployeeAvailableOnDay = (empId: string, date: Date) => {
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
    const empSchedules = schedules[empId] ?? [];
    return empSchedules.some((s) => s.day_of_week === dayName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">{business?.name ?? "Načítavam..."}</span>
          <div className="flex-1" />
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary">
            Prihlásiť sa
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Business info panel */}
        {businessInfo && step === "service" && (
          <div className="mb-6">
            <BusinessInfoPanel info={businessInfo} openStatus={openStatus} nextOpening={nextOpening} />
          </div>
        )}
        {/* Progress */}
        {step !== "done" && (
          <div className="flex items-center gap-1 mb-6">
            {(["service", "employee", "date", "time", "contact", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                (["service", "employee", "date", "time", "contact", "confirm"] as Step[]).indexOf(step) >= i
                  ? "bg-primary" : "bg-border"
              }`} />
            ))}
          </div>
        )}

        {/* Back button */}
        {step !== "service" && step !== "done" && (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Späť
          </button>
        )}

        {/* Step: Service */}
        {step === "service" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Vyberte službu</h2>
            <div className="space-y-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedService(svc); setStep("employee"); }}
                  className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{svc.name_sk}</p>
                      {svc.description_sk && <p className="text-xs text-muted-foreground mt-0.5">{svc.description_sk}</p>}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{svc.duration_minutes} min</span>
                      </div>
                    </div>
                    {svc.price != null && (
                      <span className="text-lg font-bold text-foreground">{svc.price}€</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Employee */}
        {step === "employee" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Vyberte zamestnanca</h2>
            <div className="space-y-2">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedEmployee(emp); setSelectedDate(null); setSelectedSlot(null); setStep("date"); }}
                  className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary-foreground font-semibold text-sm">
                        {emp.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{emp.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(schedules[emp.id] ?? []).length} pracovných dní
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date */}
        {step === "date" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Vyberte dátum</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {calendarDays.map((day) => {
                const available = selectedEmployee && isEmployeeAvailableOnDay(selectedEmployee.id, day);
                const isPast = isBefore(day, today);
                const isTooFar = isAfter(day, addDays(today, maxDays));
                const disabled = isPast || isTooFar || !available;
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    disabled={disabled}
                    onClick={() => { setSelectedDate(day); setSelectedSlot(null); setStep("time"); }}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : disabled
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {format(calendarDays[0], "LLLL yyyy", { locale: sk })}
            </p>
          </div>
        )}

        {/* Step: Time */}
        {step === "time" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              Vyberte čas · {selectedDate && format(selectedDate, "d. MMMM", { locale: sk })}
            </h2>
            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Žiadne dostupné termíny</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setStep("date")}>
                  Vybrať iný dátum
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.toISOString()}
                    onClick={() => { setSelectedSlot(slot); setStep("contact"); }}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedSlot && slot.getTime() === selectedSlot.getTime()
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {format(slot, "HH:mm")}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Contact */}
        {step === "contact" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Kontaktné údaje</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Meno a priezvisko *</Label>
                <Input
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Jana Nováková"
                />
                {contactErrors.name && <p className="text-destructive text-xs">{contactErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  placeholder="jana@example.sk"
                />
                {contactErrors.email && <p className="text-destructive text-xs">{contactErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Telefón (voliteľný)</Label>
                <Input
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="+421 900 000 000"
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => {
              const result = contactSchema.safeParse(contact);
              if (!result.success) {
                const errs: Record<string, string> = {};
                result.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
                setContactErrors(errs);
                return;
              }
              setContactErrors({});
              setStep("confirm");
            }}>
              Pokračovať
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Potvrdiť rezerváciu</h2>
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedService?.name_sk}</span>
                  {selectedService?.price && <Badge variant="secondary" className="ml-auto">{selectedService.price}€</Badge>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedEmployee?.display_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedDate && format(selectedDate, "EEEE, d. MMMM yyyy", { locale: sk })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedSlot && format(selectedSlot, "HH:mm")} – {selectedSlot && selectedService && format(new Date(selectedSlot.getTime() + selectedService.duration_minutes * 60000), "HH:mm")}</span>
                </div>
                <div className="border-t border-border pt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{contact.name}</p>
                  <p>{contact.email}</p>
                  {contact.phone && <p>{contact.phone}</p>}
                </div>
              </CardContent>
            </Card>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Potvrdiť rezerváciu
            </Button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && bookingResult && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Rezervácia potvrdená!</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Vaša rezervácia bola úspešne vytvorená.
              </p>
            </div>
            <Card className="border-border text-left">
              <CardContent className="p-4 space-y-2 text-sm">
                <p><strong>Služba:</strong> {selectedService?.name_sk}</p>
                <p><strong>Zamestnanec:</strong> {selectedEmployee?.display_name}</p>
                <p><strong>Dátum:</strong> {selectedDate && format(selectedDate, "d. MMMM yyyy", { locale: sk })}</p>
                <p><strong>Čas:</strong> {selectedSlot && format(selectedSlot, "HH:mm")}</p>
              </CardContent>
            </Card>

            {/* Registration CTA */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Dokonči registráciu a spravuj svoje rezervácie
                </p>
                <Button className="w-full" onClick={() => {
                  // Store claim token in sessionStorage instead of URL to prevent leakage
                  sessionStorage.setItem("claim_token", bookingResult.claim_token);
                  window.location.href = `/auth?mode=register&email=${encodeURIComponent(bookingResult.customer_email)}&name=${encodeURIComponent(bookingResult.customer_name)}`;
                }}>
                  Dokonči registráciu
                </Button>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              onClick={() => {
                setStep("service");
                setSelectedService(null);
                setSelectedEmployee(null);
                setSelectedDate(null);
                setSelectedSlot(null);
                setContact({ name: "", email: "", phone: "" });
                setBookingResult(null);
              }}
            >
              Nová rezervácia
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
