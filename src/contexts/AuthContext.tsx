import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ProfileType = "personal" | "commercial" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profileType: ProfileType;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  setProfileType: (type: "personal" | "commercial") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileType, setProfileTypeState] = useState<ProfileType>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  const fetchProfileType = useCallback(async (userId: string): Promise<ProfileType> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[Auth] Profile fetch error:", error);
        return null;
      }
      return (data?.profile_type as ProfileType) ?? null;
    } catch (err) {
      console.error("[Auth] Profile fetch exception:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Set up listener FIRST (per Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mountedRef.current) return;
        console.log("[Auth] State change:", event);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid Supabase lock contention during auth events
          setTimeout(async () => {
            if (!mountedRef.current) return;
            const pt = await fetchProfileType(newSession.user.id);
            if (mountedRef.current) {
              setProfileTypeState(pt);
              setLoading(false);
            }
          }, 0);
        } else {
          setProfileTypeState(null);
          setLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mountedRef.current || initializedRef.current) return;
      initializedRef.current = true;
      console.log("[Auth] Initial session:", initialSession ? "found" : "none");

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const pt = await fetchProfileType(initialSession.user.id);
        if (mountedRef.current) setProfileTypeState(pt);
      }
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileType]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const emailRedirectTo = `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });
    if (error) throw error;
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    console.log("[Auth] signIn called");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Auth] signIn error:", error);
      throw error;
    }
    console.log("[Auth] signIn success");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfileTypeState(null);
  };

  const setProfileType = async (type: "personal" | "commercial") => {
    if (!user) throw new Error("Usuário não autenticado");
    
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (fetchError) throw fetchError;

    if (existing) {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_type: type, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          profile_type: type,
          full_name: user.user_metadata?.full_name || null,
        });
      if (error) throw error;
    }
    
    setProfileTypeState(type);
  };

  return (
    <AuthContext.Provider value={{ session, user, profileType, loading, signUp, signIn, signOut, resendConfirmationEmail, setProfileType }}>
      {children}
    </AuthContext.Provider>
  );
};
