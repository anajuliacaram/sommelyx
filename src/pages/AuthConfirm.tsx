import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import "@/styles/auth-v6.css";

const REDIRECT_DELAY = 1800;

type ConfirmStatus = "loading" | "success" | "fallback-login" | "error";

export default function AuthConfirm() {
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profileType, loading } = useAuth();

  const reason = useMemo(() => {
    const raw = (searchParams.get("error_description") || searchParams.get("error") || "").toLowerCase();
    if (raw.includes("expired")) return "expired";
    if (raw.includes("invalid") || raw.includes("otp")) return "invalid";
    return "generic";
  }, [searchParams]);

  useEffect(() => {
    const runConfirmation = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = searchParams.get("code") || hashParams.get("code");
      const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
      const type = (searchParams.get("type") || hashParams.get("type") || "signup") as
        | "signup"
        | "recovery"
        | "invite"
        | "email_change"
        | "magiclink";

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (session) {
          analytics.trackOncePerSession("email_confirmation_success", "auth_confirm");
          setStatus("success");
          setTimeout(() => {
            if (!profileType) {
              navigate("/select-profile", { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          }, REDIRECT_DELAY);
          return;
        }

        analytics.trackOncePerSession("email_confirmation_success", "auth_confirm_fallback");
        setStatus("fallback-login");
        setTimeout(() => {
          navigate("/login?confirmed=true&auto_session=false", { replace: true });
        }, REDIRECT_DELAY);
      } catch (error: any) {
        const message = error?.message || "Não foi possível validar seu link de confirmação.";
        setErrorMessage(message);
        setStatus("error");
      } finally {
        window.history.replaceState({}, document.title, url.pathname);
      }
    };

    runConfirmation();
  }, [navigate, profileType, searchParams]);

  useEffect(() => {
    if (loading) return;
    if (user && status !== "error") {
      if (!profileType) {
        navigate("/select-profile", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [loading, user, profileType, navigate, status]);

  return (
    <div className="auth-v6 relative min-h-screen overflow-hidden text-[#1d150f]">
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg rounded-[24px] border border-white/70 bg-[rgba(255,252,246,0.72)] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(50,30,20,0.05),0_24px_56px_-28px_rgba(50,30,20,0.3)] backdrop-blur-2xl"
        >
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8C2044]/10 text-[#8C2044]">
            {status === "loading" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : status === "success" || status === "fallback-login" ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <AlertTriangle className="h-7 w-7" />
            )}
          </div>

          {status === "loading" && (
            <>
              <h1 className="text-[32px] font-medium">Confirmando seu acesso...</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">Estamos validando seu e-mail e preparando sua entrada.</p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="text-[32px] font-medium">Conta confirmada com sucesso.</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">Redirecionando para sua área.</p>
            </>
          )}

          {status === "fallback-login" && (
            <>
              <h1 className="text-[30px] font-medium">Conta confirmada com sucesso.</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">
                Seu provedor não retornou uma sessão automática nesta confirmação. Redirecionando para login para concluir o acesso.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-[30px] font-medium">Não foi possível confirmar seu acesso.</h1>
              <p className="mt-3 text-[15px] text-muted-foreground">
                {reason === "expired"
                  ? "Este link de confirmação expirou. Solicite um novo envio para continuar."
                  : reason === "invalid"
                    ? "Este link parece inválido ou já foi utilizado. Solicite um novo envio e tente novamente."
                    : "Encontramos um problema ao validar seu link. Tente novamente a partir do e-mail mais recente."}
              </p>
              {errorMessage && <p className="mt-2 text-[13px] text-destructive">{errorMessage}</p>}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="primary" className="h-11 rounded-xl px-6 text-[13px] font-medium">
                  <Link to="/signup?resend=true">Reenviar confirmação</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-6 text-[13px] font-medium">
                  <Link to="/login">Voltar para login</Link>
                </Button>
              </div>
            </>
          )}

          <p className="mt-8 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-wine">
            <Sparkles className="h-3.5 w-3.5" /> Sommelyx • fluxo seguro
          </p>
        </motion.div>
      </div>
    </div>
  );
}
