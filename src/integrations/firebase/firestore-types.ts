/** Firestore document types (aligned with docs/FIRESTORE-SCHEMA.md) */

export type AppRole = "owner" | "admin" | "employee" | "customer";
export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type HourMode = "open" | "closed" | "on_request";

export interface FirestoreBusiness {
  name: string;
  slug: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone: string;
  lead_time_minutes?: number;
  max_days_ahead?: number;
  cancellation_hours?: number;
  onboarding_completed?: boolean;
  opening_hours?: Record<string, unknown>;
  logo_url?: string | null;
  allow_admin_as_provider?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreBusinessHours {
  business_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  mode: HourMode;
  sort_order: number;
  created_at?: string;
}

export interface FirestoreBusinessDateOverride {
  business_id: string;
  override_date: string;
  mode: HourMode;
  start_time?: string | null;
  end_time?: string | null;
  label?: string | null;
  created_at?: string;
}

export interface FirestoreEmployee {
  business_id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreService {
  business_id: string;
  name_sk: string;
  description_sk?: string | null;
  duration_minutes: number;
  buffer_minutes?: number;
  price?: number | null;
  category?: string | null;
  subcategory?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreAppointment {
  business_id: string;
  employee_id: string;
  service_id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreProfile {
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreMembership {
  profile_id: string;
  business_id: string;
  role: AppRole;
  created_at?: string;
}

export interface FirestoreCustomer {
  business_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FirestoreSchedule {
  employee_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  created_at?: string;
}
