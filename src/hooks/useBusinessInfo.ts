import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessHourEntry {
  day_of_week: string;
  mode: "open" | "closed" | "on_request";
  start_time: string;
  end_time: string;
  sort_order: number;
}

export interface DateOverride {
  override_date: string;
  mode: "open" | "closed" | "on_request";
  start_time: string | null;
  end_time: string | null;
  label: string | null;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
}

export interface PublicBusinessInfo {
  business: {
    id: string;
    name: string;
    slug: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    timezone: string;
    logo_url: string | null;
    lead_time_minutes: number;
    max_days_ahead: number;
    cancellation_hours: number;
  };
  hours: BusinessHourEntry[];
  overrides: DateOverride[];
  quick_links: QuickLink[];
}

export interface OpenStatus {
  is_open: boolean;
  mode: "open" | "closed" | "on_request";
}

export interface NextOpening {
  date: string;
  time: string;
  datetime: string;
}

export function useBusinessInfo(businessId: string) {
  const [info, setInfo] = useState<PublicBusinessInfo | null>(null);
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);
  const [nextOpening, setNextOpening] = useState<NextOpening | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const load = async () => {
      setLoading(true);
      const [infoRes, openRes, nextRes] = await Promise.all([
        supabase.rpc("rpc_get_public_business_info", { _business_id: businessId }),
        supabase.rpc("rpc_is_open_now", { _business_id: businessId }),
        supabase.rpc("rpc_next_opening", { _business_id: businessId }),
      ]);

      if (infoRes.data) setInfo(infoRes.data as unknown as PublicBusinessInfo);
      if (openRes.data) setOpenStatus(openRes.data as unknown as OpenStatus);
      if (nextRes.data) setNextOpening(nextRes.data as unknown as NextOpening);
      setLoading(false);
    };

    load();
  }, [businessId]);

  return { info, openStatus, nextOpening, loading };
}
