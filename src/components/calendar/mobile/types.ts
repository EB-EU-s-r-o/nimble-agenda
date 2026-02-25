import type { CalendarView } from "../CalendarViewSwitcher";

export type CalendarEventType = "reservation" | "blocked";
export type DayExceptionType = "off" | "customHours";
export type TimeSegmentKind = "working" | "nonWorking" | "break";

export interface Employee {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  orderIndex: number;
}

export interface WorkingSchedule {
  employeeId: string;
  weekday: number; // 0 = Sunday
  start: string; // HH:mm
  end: string; // HH:mm
  breaks: Array<{ start: string; end: string }>;
}

export interface DayException {
  date: string; // yyyy-MM-dd
  employeeId: string;
  type: DayExceptionType;
  start?: string;
  end?: string;
  breaks?: Array<{ start: string; end: string }>;
}

export interface CalendarEvent {
  id: string;
  employeeId: string;
  start: string;
  end: string;
  title: string;
  clientName?: string;
  serviceName?: string;
  type: CalendarEventType;
  status: string;
}

export interface CalendarUiState {
  selectedEmployees: string[];
  currentView: CalendarView;
  currentDate: Date;
  isRefreshing: boolean;
}

export interface TimeSegment {
  startMinutes: number;
  endMinutes: number;
  kind: TimeSegmentKind;
}
