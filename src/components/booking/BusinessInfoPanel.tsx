import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, MapPin, Phone } from "lucide-react";
import type { PublicBusinessInfo, OpenStatus, NextOpening } from "@/hooks/useBusinessInfo";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";

const DAY_LABELS: Record<string, string> = {
  monday: "Po", tuesday: "Ut", wednesday: "St", thursday: "Št",
  friday: "Pi", saturday: "So", sunday: "Ne",
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const MODE_LABELS: Record<string, string> = {
  open: "Otvorené", closed: "Zatvorené", on_request: "Na požiadanie",
};

interface Props {
  info: PublicBusinessInfo;
  openStatus: OpenStatus | null;
  nextOpening: NextOpening | null;
}

export function BusinessInfoPanel({ info, openStatus, nextOpening }: Props) {
  // Group hours by day
  const hoursByDay = DAY_ORDER.map((day) => {
    const entries = info.hours.filter((h) => h.day_of_week === day);
    if (!entries.length) return { day, mode: "closed" as const, intervals: [] };
    const mode = entries[0].mode;
    return {
      day,
      mode,
      intervals: mode === "open" ? entries.map((e) => `${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}`) : [],
    };
  });

  return (
    <div className="space-y-4">
      {/* Open/Closed badge */}
      {openStatus && (
        <div className="flex items-center gap-2">
          <Badge
            variant={openStatus.is_open ? "default" : "secondary"}
            className={openStatus.is_open
              ? "bg-green-600 hover:bg-green-700 text-white"
              : openStatus.mode === "on_request"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : ""
            }
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
              openStatus.is_open ? "bg-green-200" : openStatus.mode === "on_request" ? "bg-amber-200" : "bg-muted-foreground"
            }`} />
            {MODE_LABELS[openStatus.mode]}
          </Badge>
          {!openStatus.is_open && nextOpening && (
            <span className="text-xs text-muted-foreground">
              Otvárame {format(parseISO(nextOpening.date), "EEEE", { locale: sk })} o {nextOpening.time.slice(0, 5)}
            </span>
          )}
        </div>
      )}

      {/* Weekly hours */}
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Otváracie hodiny
        </h3>
        <div className="space-y-1">
          {hoursByDay.map(({ day, mode, intervals }) => (
            <div key={day} className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground w-6">{DAY_LABELS[day]}</span>
              <span className={mode === "closed" ? "text-muted-foreground" : mode === "on_request" ? "text-amber-700" : "text-foreground"}>
                {mode === "closed" ? "Zatvorené" : mode === "on_request" ? "Na požiadanie" : intervals.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Business info */}
      {(info.business.address || info.business.phone) && (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {info.business.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {info.business.address}
            </div>
          )}
          {info.business.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> {info.business.phone}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      {info.quick_links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {info.quick_links
            .filter((link) => /^(https?:\/\/|mailto:|tel:|\/)/.test(link.url))
            .map((link) => (
              <a
                key={link.id}
                href={link.url}
                target={link.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {link.label}
                {link.url.startsWith("http") && <ExternalLink className="w-3 h-3" />}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
