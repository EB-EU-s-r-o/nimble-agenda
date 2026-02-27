import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyBuK0nuMM6DEmutVse0qGwyLhsb6d3tTxg",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "phd-booking.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "phd-booking",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "phd-booking.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1054453277711",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:1054453277711:web:e259dccf631d60cc00ef7a",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-RQR6XKDKT4",
};

const hasRequired = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

// App Check debug token (dev / localhost / CI) – Firebase Console → App Check → Manage debug tokens
const appCheckDebugToken = env.VITE_APP_CHECK_DEBUG_TOKEN as string | undefined;
if (typeof globalThis !== "undefined" && appCheckDebugToken?.trim()) {
  (globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    appCheckDebugToken.trim();
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

const db: { firestore: Firestore | null; functions: Functions | null } = {
  firestore: null,
  functions: null,
};

function getApp(): FirebaseApp | null {
  if (!hasRequired) return null;
  if (!app) {
    app = getApps().length > 0 ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  if (!auth) auth = getAuth(firebaseApp);
  return auth;
}

export function isFirebaseAuthEnabled(): boolean {
  return hasRequired;
}

export function getFirebaseApp(): FirebaseApp | null {
  return getApp();
}

/** Initialize Firebase Analytics (browser only). Call once on app load. Skips init when IndexedDB is unavailable (e.g. private mode). */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof globalThis.window === "undefined") return null;
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!analytics) analytics = getAnalytics(firebaseApp);
  return analytics;
}

export function getFirebaseFirestore(): Firestore | null {
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  if (!db.firestore) db.firestore = getFirestore(firebaseApp);
  return db.firestore;
}

export function getFirebaseFunctions(): Functions | null {
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  if (!db.functions) db.functions = getFunctions(firebaseApp, "europe-west1");
  return db.functions;
}
