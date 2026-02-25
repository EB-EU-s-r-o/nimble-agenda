import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Loader2, Lock } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface EmployeeOption {
  id: string;
  display_name: string;
}

interface BlockTimeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  employees: EmployeeOption[];
  onSubmit: (payload: {
    employee_id: string;
    start_at: string;
    end_at: string;
    reason: string;
  }) => Promise<void>;
}

const roundToQuarter = (date: Date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  d.setMinutes(Math.ceil(minutes / 15) * 15, 0, 0);
  return d;
};

const toInputDateTimeValue = (date: Date) => {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getValidationError = (
  employeeId: string,
  startAt: string,
  endAt: string,
): string | null => {
  if (!employeeId) return "Vyberte zamestnanca.";
  if (!startAt || !endAt) return "Vyplňte čas od aj do.";

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Neplatný dátum alebo čas.";
  }

  if (end <= start) return "Čas 'Do' musí byť neskôr ako čas 'Od'.";
  return null;
};

export default function BlockTimeSheet({
  open,
  onOpenChange,
  date,
  employees,
  onSubmit,
}: BlockTimeSheetProps) {
  const defaultStart = useMemo(() => roundToQuarter(date), [date]);
  const defaultEnd = useMemo(
    () => new Date(defaultStart.getTime() + 30 * 60_000),
    [defaultStart],
  );

  const [employeeId, setEmployeeId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("Pauza");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId((prev) => prev || employees[0]?.id || "");
    setStartAt(toInputDateTimeValue(defaultStart));
    setEndAt(toInputDateTimeValue(defaultEnd));
    setReason("Pauza");
    setSubmitError(null);
  }, [open, defaultStart, defaultEnd, employees]);

  const validationError = getValidationError(employeeId, startAt, endAt);

  const handleSubmit = async () => {
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        employee_id: employeeId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        reason: reason.trim() || "Blokovaný čas",
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nepodarilo sa uložiť blokovaný čas.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Blokovať čas
          </DrawerTitle>
          <DrawerDescription>
            {format(date, "EEEE d. MMMM yyyy", { locale: sk })}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-3 overflow-y-auto px-4 pb-2">
          <div className="space-y-1.5">
            <Label>Zamestnanec</Label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              disabled={submitting}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Od</Label>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Do</Label>
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Dôvod</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pauza / Interné / Dovolenka"
              disabled={submitting}
            />
          </div>

          {(submitError || validationError) && (
            <p className="text-xs font-medium text-destructive">
              {submitError || validationError}
            </p>
          )}
        </div>

        <DrawerFooter>
          <button
            onClick={handleSubmit}
            disabled={submitting || Boolean(validationError)}
            className="w-full rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Ukladám...
              </span>
            ) : (
              "Uložiť blokovaný čas"
            )}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
