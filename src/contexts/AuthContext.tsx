import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getFirebaseAuth, isFirebaseAuthEnabled } from "@/integrations/firebase/config";
import type { User as FirebaseUser } from "firebase/auth";

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

interface AuthContextType {
  user: User | null;
  session: Session | null;
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

async function fetchProfileViaRPC(): Promise<{ profile: Profile | null; memberships: Membership[] }> {
  // These RPCs exist only when Firebase-auth mode is configured in the backend.
  // The generated DB types may not include them, so we keep this call permissive.
  const { data: profileRows } = await (supabase.rpc as any)("get_my_profile");
  const { data: membershipRows } = await (supabase.rpc as any)("get_my_memberships");

  const profile = Array.isArray(profileRows) && profileRows[0]
    ? (profileRows[0] as Profile)
    : null;
  const memberships = Array.isArray(membershipRows)
    ? (membershipRows as Membership[])
    : [];

  return { profile, memberships };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) setProfile(profileData as Profile);

    const { data: membershipData } = await supabase
      .from("memberships")
      .select("*")
      .eq("profile_id", userId);

    if (membershipData) setMemberships(membershipData as Membership[]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (isFirebaseAuthEnabled()) {
      const { profile: p, memberships: m } = await fetchProfileViaRPC();
      setProfile(p);
      setMemberships(m ?? []);
      return;
    }
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem("auth_session_tab_only") === "true") {
        if (!isFirebaseAuthEnabled()) supabase.auth.signOut();
        sessionStorage.removeItem("auth_session_tab_only");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const firebaseEnabled = isFirebaseAuthEnabled();

  useEffect(() => {
    if (firebaseEnabled) {
      const auth = getFirebaseAuth();
      if (!auth) {
        setLoading(false);
        return;
      }
      const unsub = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setMemberships([]);
          setLoading(false);
          return;
        }
        try {
          await (supabase.rpc as any)("ensure_my_firebase_profile", {
            p_email: firebaseUser.email ?? undefined,
            p_full_name: firebaseUser.displayName ?? undefined,
          });
          const { profile: p, memberships: m } = await fetchProfileViaRPC();
          setProfile(p);
          setMemberships(m ?? []);
          setUser({
            id: p?.id ?? firebaseUser.uid,
            email: p?.email ?? firebaseUser.email ?? null,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "",
          } as User);
          setSession(null);
        } catch {
          setUser(null);
          setProfile(null);
          setMemberships([]);
        }
        setLoading(false);
      });
      return () => unsub();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setMemberships([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [firebaseEnabled, fetchProfile]);

  const signOut = useCallback(async () => {
    if (firebaseEnabled) {
      const auth = getFirebaseAuth();
      await auth?.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setMemberships([]);
    } else {
      await supabase.auth.signOut();
    }
  }, [firebaseEnabled]);

  return (
    <AuthContext.Provider value={{ user, session, profile, memberships, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
