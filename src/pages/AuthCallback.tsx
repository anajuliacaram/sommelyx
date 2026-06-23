import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle } from "@/icons/lucide";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { designSystem } from "@/styles/designSystem";
import "@/styles/auth-v6.css";

type CallbackStatus = "loading" | "success" | "error";

const getHashValue = (key: string) => {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get(key);
};

export default function AuthCallback() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("Confirmando sua conta...");
  const navigate = useNavigate();
  const { user, profileType, loading: authLoading } = useAuth();

  const hashError = useMemo(() => getHashValue("error_description") || getHashValue("error"), []);

  useEffect(() => {
    const finishCallback = async () => {
      try {
        if (hashError) {
          setStatus("error");
          setMessage(decodeURIComponent(hashError).replace(/\+/g, " "));
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus("error");
            setMessage(error.message || "Não foi possível confirmar seu e-mail.");
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setStatus("error");
          setMessage(error.message || "Não foi possível recuperar sua sessão.");
          return;
        }

        if (data.session) {
          analytics.trackOncePerSession("email_confirmation_success", "auth_callback");
          setStatus("success");
          setMessage("E-mail confirmado com sucesso. Redirecionando...");
          return;
        }

        setStatus("error");
        setMessage("Confirmação concluída, mas não foi possível iniciar sessão automaticamente.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Link de confirmação inválido ou expirado.");
      }
    };

    finishCallback();
  }, [hashError]);

  useEffect(() => {
    if (status !== "success" || authLoading) return;

    const target = user ? (profileType ? "/dashboard" : "/select-profile") : "/login?confirmed=true";
    const timer = setTimeout(() => navigate(target, { replace: true }), 800);
    return () => clearTimeout(timer);
  }, [status, user, profileType, authLoading, navigate]);

  if (authLoading && status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F7F8" }}>
        <div className="space-y-3 w-48 animate-pulse">
          <div className="h-6 w-full rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }} />
          <div className="h-4 w-3/4 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
        </div>
      </div>
    );
  }

  if (status === "success" && user && !authLoading) {
    return <Navigate to={profileType ? "/dashboard" : "/select-profile"} replace />;
  }

  return (
    <div className="auth-v6 min-h-screen flex items-center justify-center p-6 text-[#1d150f]">
      <div className="relative z-10 w-full max-w-lg rounded-[24px] border border-white/70 bg-[rgba(255,252,246,0.72)] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(50,30,20,0.05),0_24px_56px_-28px_rgba(50,30,20,0.3)] backdrop-blur-2xl md:p-10">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-5 h-9 w-9 animate-spin text-wine" />
            <h1 className="text-[30px] font-medium text-[#1d150f]">Confirmando acesso</h1>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-5 h-10 w-10 text-emerald-600" />
            <h1 className="text-[30px] font-medium text-[#1d150f]">Conta confirmada</h1>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="mx-auto mb-5 h-10 w-10 text-[#E07A5F]" />
            <h1 className="text-[30px] font-medium text-[#1d150f]">Não foi possível confirmar</h1>
          </>
        )}

        <p className="mt-4 text-[15px] font-normal leading-relaxed text-[rgba(72,60,46,0.7)]">{message}</p>

        {status === "error" && (
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate("/login?confirmed=true", { replace: true })}
              className={`w-full ${designSystem.primaryButton}`}
            >
              Ir para login
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/signup", { replace: true })}
              className={`w-full ${designSystem.secondaryButton}`}
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
