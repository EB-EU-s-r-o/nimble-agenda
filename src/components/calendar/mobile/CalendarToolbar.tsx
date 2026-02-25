import { Lock, Plus, RefreshCw } from "lucide-react";
import CalendarViewSwitcher, { type CalendarView } from "../CalendarViewSwitcher";

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onAddReservation: () => void;
  onBlockTime: () => void;
  onRefresh: () => void;
  onToday: () => void;
  refreshing: boolean;
}

export default function CalendarToolbar(props: CalendarToolbarProps) {
  const { view, onViewChange, onAddReservation, onBlockTime, onRefresh, onToday, refreshing } = props;

  return (
    <div className="space-y-3 px-4 pb-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onAddReservation} className="cal-toolbar-btn bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> + Pridať rezerváciu
        </button>
        <button onClick={onBlockTime} className="cal-toolbar-btn bg-secondary text-secondary-foreground">
          <Lock className="h-4 w-4" /> Blokovať čas
        </button>
        <button onClick={onRefresh} className="cal-toolbar-btn" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Obnoviť
        </button>
        <button onClick={onToday} className="cal-toolbar-btn">Dnes</button>
      </div>
      <div className="flex justify-center">
        <CalendarViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
