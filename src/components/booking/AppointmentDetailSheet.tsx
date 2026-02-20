import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Clock, User, Scissors, XCircle, Check, MoveHorizontal } from "lucide-react";
import type { CalendarAppointment } from "@/components/calendar/AppointmentBlock";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Čaká na potvrdenie", color: "text-gold" },
  confirmed: { label: "Potvrdená", color: "text-emerald-400" },
  cancelled: { label: "Zrušená", color: "text-red-400" },
  completed: { label: "Dokončená", color: "text-white/50" },
};

interface AppointmentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: CalendarAppointment | null;
  onCancel?: (id: string) => void;
  onMarkArrived?: (id: string) => void;
}

export default function AppointmentDetailSheet({
  open,
  onOpenChange,
  appointment,
  onCancel,
  onMarkArrived,
}: AppointmentDetailSheetProps) {
  if (!appointment) return null;

  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pending;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[hsl(222,20%,10%)] border-white/10 text-white">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-white text-lg flex items-center gap-2">
            {appointment.service_name}
            <span className={`text-xs font-normal ${status.color}`}>· {status.label}</span>
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-white/30 shrink-0" />
              <span className="text-white/80">
                {format(start, "EEEE d. MMMM", { locale: sk })} · {format(start, "HH:mm")}–{format(end, "HH:mm")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-white/30 shrink-0" />
              <span className="text-white/80">{appointment.customer_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Scissors className="w-4 h-4 text-white/30 shrink-0" />
              <span className="text-white/80">{appointment.employee_name}</span>
            </div>
          </div>

          {appointment.notes && (
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <p className="text-xs text-white/50">{appointment.notes}</p>
            </div>
          )}
        </div>

        <DrawerFooter className="gap-2">
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <>
              <button
                onClick={() => onMarkArrived?.(appointment.id)}
                className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Check className="w-4 h-4" /> Označiť prišiel
              </button>
              <button
                onClick={() => onCancel?.(appointment.id)}
                className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <XCircle className="w-4 h-4" /> Zrušiť
              </button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
