import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

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
    <div className="relative min-h-screen overflow-hidden bg-[#F6F3F2] text-[#17141D]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#8C2044]/20 via-[#B44A72]/10 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-[#DBB58E]/18 via-[#C87595]/10 to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg rounded-[28px] border border-white/55 bg-white/70 p-8 text-center shadow-[0_24px_64px_-24px_rgba(15,15,20,0.2),0_2px_8px_rgba(15,15,20,0.06)] ring-1 ring-black/[0.03] backdrop-blur-2xl"
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
              <h1 className="text-[32px] font-serif font-bold italic">Confirmando seu acesso...</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">Estamos validando seu e-mail e preparando sua entrada.</p>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="text-[32px] font-serif font-bold italic">Conta confirmada com sucesso.</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">Redirecionando para sua área.</p>
            </>
          )}

          {status === "fallback-login" && (
            <>
              <h1 className="text-[30px] font-serif font-bold italic">Conta confirmada com sucesso.</h1>
              <p className="mt-3 text-[15px] text-[#5B5564]">
                Seu provedor não retornou uma sessão automática nesta confirmação. Redirecionando para login para concluir o acesso.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-[30px] font-serif font-bold italic">Não foi possível confirmar seu acesso.</h1>
              <p className="mt-3 text-[15px] text-muted-foreground">
                {reason === "expired"
                  ? "Este link de confirmação expirou. Solicite um novo envio para continuar."
                  : reason === "invalid"
                    ? "Este link parece inválido ou já foi utilizado. Solicite um novo envio e tente novamente."
                    : "Encontramos um problema ao validar seu link. Tente novamente a partir do e-mail mais recente."}
              </p>
              {errorMessage && <p className="mt-2 text-[13px] text-destructive">{errorMessage}</p>}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="primary" className="h-11 rounded-xl px-6 text-[12px] font-black uppercase tracking-[0.12em]">
                  <Link to="/signup?resend=true">Reenviar confirmação</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl px-6 text-[12px] font-black uppercase tracking-[0.12em]">
                  <Link to="/login">Voltar para login</Link>
                </Button>
              </div>
            </>
          )}

          <p className="mt-8 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sommelyx • fluxo seguro
          </p>
        </motion.div>
      </div>
    </div>
  );
}
