import { motion } from "framer-motion";

export type CalendarView = "month" | "week" | "day";

interface CalendarViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "month", label: "Mesiac" },
  { key: "week", label: "Týždeň" },
  { key: "day", label: "Deň" },
];

export default function CalendarViewSwitcher({ view, onViewChange }: CalendarViewSwitcherProps) {
  return (
    <div className="relative flex rounded-full bg-muted p-0.5 gap-0.5">
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          className={`relative z-10 px-3.5 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
            view === key
              ? "text-gold-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {view === key && (
            <motion.div
              layoutId="view-pill"
              className="absolute inset-0 rounded-full bg-gold shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
}
