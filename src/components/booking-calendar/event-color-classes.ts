/**
 * Event chip farby z CSS premenných (--calendar-*) – light/dark a zlato/čierna téma.
 */
export const EVENT_COLOR_CLASSES: Record<string, string> = {
  pending:
    "bg-calendar-pending/15 hover:bg-calendar-pending/25 border-calendar-pending text-calendar-pending-fg",
  confirmed:
    "bg-calendar-confirmed/20 hover:bg-calendar-confirmed/30 border-calendar-confirmed text-calendar-confirmed-fg",
  cancelled:
    "bg-calendar-cancelled/15 hover:bg-calendar-cancelled/25 border-calendar-cancelled text-calendar-cancelled-fg",
  completed:
    "bg-calendar-completed/25 hover:bg-calendar-completed/35 border-calendar-completed text-calendar-completed-fg",
};

export function getEventColorClasses(color: string): string {
  return (
    EVENT_COLOR_CLASSES[color] ??
    "bg-muted hover:bg-muted/80 border-border text-foreground"
  );
}
