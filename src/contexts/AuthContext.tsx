import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getFirebaseAuth, getFirebaseFirestore, getFirebaseFunctions, isFirebaseAuthEnabled } from "@/integrations/firebase/config";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Membership {
  id: string;
  business_id: string;
  profile_id: string;
  role: "owner" | "admin" | "employee" | "customer";
}

/** Normalized user for components that expect .id (Firebase uses .uid) */
export interface AuthUser {
  id: string;
  email: string | null;
  uid: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  profile: Profile | null;
  memberships: Membership[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  memberships: [],
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function toAuthUser(firebaseUser: FirebaseUser): AuthUser {
  return { id: firebaseUser.uid, email: firebaseUser.email ?? null, uid: firebaseUser.uid };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const auth = getFirebaseAuth();
    const firestore = getFirebaseFirestore();
    if (!auth?.currentUser || !firestore) return;
    const uid = auth.currentUser.uid;
    const profileRef = doc(firestore, "profiles", uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const d = profileSnap.data();
      setProfile({
        id: uid,
        full_name: d.full_name ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        avatar_url: d.avatar_url ?? null,
      });
    } else {
      setProfile({
        id: uid,
        full_name: auth.currentUser.displayName ?? null,
        email: auth.currentUser.email ?? null,
        phone: null,
        avatar_url: null,
      });
    }
    const membershipsSnap = await getDocs(
      query(collection(firestore, "memberships"), where("profile_id", "==", uid))
    );
    setMemberships(
      membershipsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          business_id: data.business_id,
          profile_id: data.profile_id,
          role: data.role,
        };
      })
    );
  }, []);

  useEffect(() => {
    if (!isFirebaseAuthEnabled()) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setMemberships([]);
        setLoading(false);
        return;
      }
      setUser(toAuthUser(firebaseUser));
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        setLoading(false);
        return;
      }
      try {
        // Ensure Supabase accepts Firebase JWT: set custom claim role='authenticated' and refresh token
        const functions = getFirebaseFunctions();
        const ensureRole = functions
          ? httpsCallable<unknown, { ok: boolean }>(functions, "ensureSupabaseRole")
          : null;
        if (ensureRole) await ensureRole({}).catch(() => { /* non-blocking; Supabase may still work if claim already set */ });
        await firebaseUser.getIdToken(true);

        const profileRef = doc(firestore, "profiles", firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            email: firebaseUser.email ?? null,
            full_name: firebaseUser.displayName ?? null,
            phone: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        await refreshProfile();
      } catch {
        setProfile(null);
        setMemberships([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await auth?.signOut();
    setUser(null);
    setProfile(null);
    setMemberships([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session: null, profile, memberships, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
