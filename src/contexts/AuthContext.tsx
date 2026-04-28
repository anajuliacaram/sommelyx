import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getOptionalClientEnv } from "@/lib/env";

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
const appUrl = getOptionalClientEnv("VITE_APP_URL");

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeFullName = (value: string) => value.trim().replace(/\s+/g, " ");
const debugAuth = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.debug(...args);
};

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
  const emailRedirectTo = `${(appUrl ?? window.location.origin).replace(/\/$/, "")}/auth/confirm`;

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
    const loadingTimeout = window.setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mountedRef.current) return;
        debugAuth("[Auth] State change:", event);

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        if (newSession?.user) {
          void fetchProfileType(newSession.user.id).then((pt) => {
            if (mountedRef.current) setProfileTypeState(pt);
          });
        } else {
          setProfileTypeState(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mountedRef.current) return;
      if (error) {
        console.error("[Auth] Initial session error:", error);
      }
      debugAuth("[Auth] Initial session:", initialSession ? "found" : "none");

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      if (initialSession?.user) {
        void fetchProfileType(initialSession.user.id).then((pt) => {
          if (mountedRef.current) setProfileTypeState(pt);
        });
      }
    }).catch((error) => {
      console.error("[Auth] getSession failed:", error);
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfileType]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        data: { full_name: normalizeFullName(fullName) },
        emailRedirectTo,
      },
    });
    if (error) throw error;
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizeEmail(email),
      options: {
        emailRedirectTo,
      },
    });

    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) throw error;
    debugAuth("[Auth] signIn success");
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    }
    catch (error) {
      debugAuth("[Auth] signOut fallback cleanup:", error);
    }

    if (!mountedRef.current) return;
    setSession(null);
    setUser(null);
    setProfileTypeState(null);
    setLoading(false);
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
          full_name:
            typeof user.user_metadata?.full_name === "string"
              ? normalizeFullName(user.user_metadata.full_name)
              : null,
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
