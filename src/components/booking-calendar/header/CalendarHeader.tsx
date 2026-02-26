import type { ReactNode } from "react";

export function CalendarHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 border-b border-border shrink-0 booking-calendar-header">
      {children}
    </div>
  );
}
