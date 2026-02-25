import type { Employee } from "./types";
import { X } from "lucide-react";

interface EmployeeFilterProps {
  employees: Employee[];
  selectedEmployeeIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}

export default function EmployeeFilter({ employees, selectedEmployeeIds, onToggle, onSelectAll }: EmployeeFilterProps) {
  const allSelected = employees.length > 0 && selectedEmployeeIds.length === employees.length;

  return (
    <section className="space-y-2 px-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pracovníci</h2>
        <button onClick={onSelectAll} className="text-xs font-medium text-primary">
          {allSelected ? "Zrušiť výber" : "Vyber všetkých"}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {employees.map((employee) => {
          const selected = selectedEmployeeIds.includes(employee.id);

          return (
            <button
              key={employee.id}
              onClick={() => onToggle(employee.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selected ? "text-white border-transparent shadow-sm" : "text-muted-foreground bg-muted/50 border-border"
              }`}
              style={selected ? { backgroundColor: employee.color } : undefined}
              aria-pressed={selected}
            >
              <span className="truncate max-w-[6.5rem]">{employee.name}</span>
              {selected && <X className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
