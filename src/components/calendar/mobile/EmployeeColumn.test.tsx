import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmployeeColumn from "./EmployeeColumn";
import type { CalendarEvent, Employee, TimeSegment } from "./types";

describe("EmployeeColumn", () => {
  it("prevents booking callback in blocked slot and passes false", async () => {
    const onSlotClick = vi.fn();

    const employee: Employee = {
      id: "e1",
      name: "Papi",
      color: "#22c55e",
      isActive: true,
      orderIndex: 0,
    };

    const segments: TimeSegment[] = [
      { startMinutes: 480, endMinutes: 720, kind: "working" },
      { startMinutes: 720, endMinutes: 1320, kind: "nonWorking" },
    ];

    const events: CalendarEvent[] = [
      {
        id: "b1",
        employeeId: "e1",
        start: "2026-01-05T09:00:00.000Z",
        end: "2026-01-05T10:00:00.000Z",
        title: "Pauza",
        type: "blocked",
        status: "confirmed",
      },
    ];

    render(
      <EmployeeColumn
        employee={employee}
        events={events}
        segments={segments}
        date={new Date("2026-01-05T00:00:00.000Z")}
        startHour={8}
        endHour={12}
        hourHeight={40}
        timezone="UTC"
        onSlotClick={onSlotClick}
        onEventClick={() => {}}
      />, 
    );

    const blockedSlot = screen.getByTitle("Čas je blokovaný");
    fireEvent.click(blockedSlot);

    expect(onSlotClick).toHaveBeenCalled();
    expect(onSlotClick.mock.calls[0][2]).toBe(false);
  });
});
