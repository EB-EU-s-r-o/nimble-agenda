import type { TimeSegment } from "./types";

interface NonWorkingOverlayProps {
  hourHeight: number;
  startHour: number;
  segments: TimeSegment[];
}

export default function NonWorkingOverlay({ hourHeight, startHour, segments }: NonWorkingOverlayProps) {
  return (
    <>
      {segments
        .filter((item) => item.kind !== "working")
        .map((segment, index) => {
          const top = ((segment.startMinutes - startHour * 60) / 60) * hourHeight;
          const height = ((segment.endMinutes - segment.startMinutes) / 60) * hourHeight;

          return (
            <div
              key={`${segment.kind}-${segment.startMinutes}-${index}`}
              className={`absolute inset-x-0 ${segment.kind === "break" ? "cal-break-overlay" : "cal-non-working-overlay"}`}
              style={{ top, height }}
            />
          );
        })}
    </>
  );
}
