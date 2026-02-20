import { useState } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Clock, Scissors, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

interface Service {
  id: string;
  name_sk: string;
  duration_minutes: number;
  price: number | null;
}

interface Employee {
  id: string;
  display_name: string;
}

interface QuickBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotTime: Date | null;
  services: Service[];
  employees: Employee[];
  onSubmit: (data: {
    service_id: string;
    employee_id: string;
    start_at: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
  }) => Promise<void>;
}

export default function QuickBookingSheet({
  open,
  onOpenChange,
  slotTime,
  services,
  employees,
  onSubmit,
}: QuickBookingSheetProps) {
  const [selectedService, setSelectedService] = useState<string>(services[0]?.id ?? "");
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0]?.id ?? "");
  const [step, setStep] = useState<"pick" | "contact">("pick");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const svc = services.find((s) => s.id === selectedService);

  const handleBook = async () => {
    if (!slotTime || !selectedService || !selectedEmployee) return;
    if (step === "pick") {
      setStep("contact");
      return;
    }
    if (!contact.name || !contact.email) return;

    setSubmitting(true);
    try {
      await onSubmit({
        service_id: selectedService,
        employee_id: selectedEmployee,
        start_at: slotTime.toISOString(),
        customer_name: contact.name,
        customer_email: contact.email,
        customer_phone: contact.phone || undefined,
      });
      onOpenChange(false);
      setStep("pick");
      setContact({ name: "", email: "", phone: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep("pick");
      setContact({ name: "", email: "", phone: "" });
    }
    onOpenChange(v);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-[hsl(222,20%,10%)] border-white/10 text-white max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-white text-lg">
            {step === "pick" ? "Nová rezervácia" : "Kontaktné údaje"}
          </DrawerTitle>
          {slotTime && (
            <DrawerDescription className="text-white/50">
              {format(slotTime, "EEEE d. MMMM · HH:mm", { locale: sk })}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-4 overflow-y-auto">
          {step === "pick" ? (
            <>
              {/* Service selection */}
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Služba</label>
                <div className="space-y-1.5">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                        selectedService === s.id
                          ? "border-gold/50 bg-gold/10"
                          : "border-white/10 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <Scissors className="w-4 h-4 text-gold shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{s.name_sk}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span className="text-xs text-white/40">{s.duration_minutes} min</span>
                        </div>
                      </div>
                      {s.price != null && (
                        <span className="text-sm font-bold text-gold">{s.price}€</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee selection */}
              {employees.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Zamestnanec</label>
                  <div className="flex gap-2 flex-wrap">
                    {employees.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedEmployee(e.id)}
                        className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                          selectedEmployee === e.id
                            ? "border-gold/50 bg-gold/10 text-gold"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/8"
                        }`}
                      >
                        {e.display_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Meno *</Label>
                <Input
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Jana Nováková"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Email *</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  placeholder="jana@example.sk"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Telefón</Label>
                <Input
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="+421 900 000 000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <button
            onClick={handleBook}
            disabled={submitting || (step === "contact" && (!contact.name || !contact.email))}
            className="w-full py-3.5 rounded-2xl bg-gold text-gold-foreground font-semibold text-base transition-all active:scale-[0.97] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === "pick" ? "Pokračovať" : "Rezervovať"}
          </button>
          {step === "contact" && (
            <button
              onClick={() => setStep("pick")}
              className="w-full py-2.5 rounded-2xl text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              Späť
            </button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
