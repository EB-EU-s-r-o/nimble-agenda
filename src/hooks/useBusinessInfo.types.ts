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
