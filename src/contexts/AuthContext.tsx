import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("profile_type")
            .eq("user_id", session.user.id)
            .single();
          setProfileTypeState((data?.profile_type as ProfileType) ?? null);
        } else {
          setProfileTypeState(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("profile_type")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            setProfileTypeState((data?.profile_type as ProfileType) ?? null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const setProfileType = async (type: "personal" | "commercial") => {
    if (!user) throw new Error("Usuário não autenticado");
    
    // Try update first
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
