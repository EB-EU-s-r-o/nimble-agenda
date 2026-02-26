export type {
  BusinessHourEntry,
  DateOverride,
  QuickLink,
  PublicBusinessInfo,
  OpenStatus,
  NextOpening,
} from "./useBusinessInfo.types";

export { useBusinessInfoFirestore as useBusinessInfo } from "@/integrations/firebase/useBusinessInfoFirestore";
