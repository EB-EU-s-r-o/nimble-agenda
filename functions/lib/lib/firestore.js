import { getFirestore } from "firebase-admin/firestore";
export const db = getFirestore();
export function membershipsDocId(profileId, businessId) {
    return `${profileId}_${businessId}`;
}
