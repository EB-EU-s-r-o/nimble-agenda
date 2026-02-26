import { getFirestore } from "firebase-admin/firestore";

export const db = getFirestore();

export function membershipsDocId(profileId: string, businessId: string): string {
  return `${profileId}_${businessId}`;
}
