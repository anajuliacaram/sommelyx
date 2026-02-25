import React, { createContext, useContext, useEffect, useState } from "react";
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

  const fetchProfileType = async (userId: string): Promise<ProfileType> => {
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
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      console.log("[Auth] Initial session:", session ? "found" : "none");
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const pt = await fetchProfileType(session.user.id);
        if (mounted) setProfileTypeState(pt);
      }
      if (mounted) setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("[Auth] State change:", event, session ? "session" : "no-session");
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const pt = await fetchProfileType(session.user.id);
          if (mounted) setProfileTypeState(pt);
        } else {
          setProfileTypeState(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
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
    <AuthContext.Provider value={{ session, user, profileType, loading, signUp, signIn, signOut, setProfileType }}>
      {children}
    </AuthContext.Provider>
  );
};
