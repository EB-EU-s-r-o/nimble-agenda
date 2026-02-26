import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getFirebaseFirestore } from "@/integrations/firebase/config";
import type { FirestoreBusiness, FirestoreBusinessHours, FirestoreBusinessDateOverride } from "@/integrations/firebase/firestore-types";
import type { BusinessHourEntry, DateOverride, OpenStatus, NextOpening, PublicBusinessInfo, QuickLink } from "@/hooks/useBusinessInfo.types";

function toBusinessHourEntry(h: FirestoreBusinessHours): BusinessHourEntry {
  return {
    day_of_week: h.day_of_week,
    mode: h.mode,
    start_time: h.start_time,
    end_time: h.end_time,
    sort_order: h.sort_order ?? 0,
  };
}

function toDateOverride(o: FirestoreBusinessDateOverride): DateOverride {
  return {
    override_date: o.override_date,
    mode: o.mode,
    start_time: o.start_time ?? null,
    end_time: o.end_time ?? null,
    label: o.label ?? null,
  };
}

function computeOpenStatus(
  tz: string,
  hours: BusinessHourEntry[],
  overrides: DateOverride[]
): OpenStatus {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "monday";
  const timeStr = parts.find((p) => p.type === "hour")?.value + ":" + (parts.find((p) => p.type === "minute")?.value ?? "00");
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz });
  const override = overrides.find((o) => o.override_date === dateStr);
  if (override) {
    if (override.mode === "closed") return { is_open: false, mode: "closed" };
    if (override.mode === "on_request") return { is_open: false, mode: "on_request" };
    if (override.start_time && override.end_time && timeStr >= override.start_time && timeStr < override.end_time) return { is_open: true, mode: "open" };
    return { is_open: false, mode: "open" };
  }
  const dayHours = hours.filter((h) => h.day_of_week === weekday);
  for (const h of dayHours) {
    if (h.mode === "closed") continue;
    if (h.mode === "on_request") return { is_open: false, mode: "on_request" };
    if (timeStr >= h.start_time && timeStr < h.end_time) return { is_open: true, mode: "open" };
  }
  return { is_open: false, mode: "open" };
}

function computeNextOpening(tz: string, hours: BusinessHourEntry[], overrides: DateOverride[]): NextOpening | null {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  for (let d = 0; d < 8; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = formatter.format(date).replace(/\//g, "-");
    const weekday = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" }).toLowerCase();
    const override = overrides.find((o) => o.override_date === dateStr);
    let intervals: { start: string; end: string }[] = [];
    if (override?.mode === "open" && override.start_time && override.end_time) {
      intervals = [{ start: override.start_time, end: override.end_time }];
    } else if (!override || override.mode !== "closed") {
      const dayHours = hours.filter((h) => h.day_of_week === weekday && h.mode === "open");
      intervals = dayHours.map((h) => ({ start: h.start_time, end: h.end_time }));
    }
    const timeStr = now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    for (const iv of intervals) {
      if (d === 0 && timeStr >= iv.end) continue;
      const openTime = d === 0 && timeStr < iv.start ? iv.start : iv.start;
      const [h, m] = openTime.split(":").map(Number);
      const openDate = new Date(date);
      openDate.setHours(h, m, 0, 0);
      if (openDate > now) {
        return {
          date: dateStr,
          time: openTime,
          datetime: openDate.toISOString(),
        };
      }
    }
  }
  return null;
}

export function useBusinessInfoFirestore(businessId: string) {
  const [info, setInfo] = useState<PublicBusinessInfo | null>(null);
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
  const [nextOpening, setNextOpening] = useState<NextOpening | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const load = async () => {
      setLoading(true);
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setLoading(false);
        return;
      }
      try {
        const [bizSnap, hoursSnap, overridesSnap, linksSnap] = await Promise.all([
          getDoc(doc(firestore, "businesses", businessId)),
          getDocs(query(collection(firestore, "business_hours"), where("business_id", "==", businessId), orderBy("sort_order"))),
          getDocs(query(collection(firestore, "business_date_overrides"), where("business_id", "==", businessId))),
          getDocs(query(collection(firestore, "business_quick_links"), where("business_id", "==", businessId), orderBy("sort_order"))),
        ]);

        const biz = bizSnap.data() as FirestoreBusiness | undefined;
        if (!biz) {
          setLoading(false);
          return;
        }
        const hours = hoursSnap.docs.map((d) => toBusinessHourEntry(d.data() as FirestoreBusinessHours));
        const overrides = overridesSnap.docs.map((d) => toDateOverride(d.data() as FirestoreBusinessDateOverride));
        const quick_links: QuickLink[] = linksSnap.docs.map((d) => ({
          id: d.id,
          label: d.data().label,
          url: d.data().url,
          sort_order: d.data().sort_order ?? 0,
        }));

        const tz = biz.timezone || "Europe/Bratislava";
        setInfo({
          business: {
            id: businessId,
            name: biz.name,
            slug: biz.slug ?? null,
            address: biz.address ?? null,
            phone: biz.phone ?? null,
            email: biz.email ?? null,
            timezone: tz,
            logo_url: biz.logo_url ?? null,
            lead_time_minutes: biz.lead_time_minutes ?? 0,
            max_days_ahead: biz.max_days_ahead ?? 365,
            cancellation_hours: biz.cancellation_hours ?? 24,
          },
          hours,
          overrides,
          quick_links,
        });
        setOpenStatus(computeOpenStatus(tz, hours, overrides));
        setNextOpening(computeNextOpening(tz, hours, overrides));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId]);

  return { info, openStatus, nextOpening, loading };
}
