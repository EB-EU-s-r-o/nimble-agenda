import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

const firebaseConfig = apiKey && authDomain && projectId && appId
  ? { apiKey, authDomain, projectId, appId }
  : null;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfig) return null;
  if (!app) {
    app = getApps().length > 0 ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig);
  }
  if (!auth) auth = getAuth(app);
  return auth;
}

export function isFirebaseAuthEnabled(): boolean {
  return Boolean(firebaseConfig);
}
