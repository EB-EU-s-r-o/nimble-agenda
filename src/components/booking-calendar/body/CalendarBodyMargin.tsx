import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { HOURS } from "../calendar-types";

export function CalendarBodyMargin({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "sticky left-0 w-12 bg-background z-10 flex flex-col shrink-0",
        className
      )}
    >
      <div className="sticky top-0 left-0 h-[33px] bg-background z-20 border-b border-border" />
      <div className="sticky left-0 w-12 bg-background z-10 flex flex-col">
        {HOURS.map((hour) => (
          <div key={hour} className="relative h-32 first:mt-0">
            {hour !== 0 && (
              <span className="absolute text-xs text-muted-foreground -top-2.5 left-2">
                {format(new Date().setHours(hour, 0, 0, 0), "H", { locale: sk })}
                :00
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
