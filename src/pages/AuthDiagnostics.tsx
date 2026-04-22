import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://xhjcwxspndvcsgdlmaqy.supabase.co";
const STORAGE_KEY = "sommelyx.auth.token";
const EXPECTED_REF = "xhjcwxspndvcsgdlmaqy";

type CheckStatus = "ok" | "warn" | "fail" | "pending";
type Check = { id: string; label: string; status: CheckStatus; detail?: string };

function statusColor(s: CheckStatus) {
  if (s === "ok") return { bg: "rgba(95,127,82,0.12)", color: "#3F6234", label: "OK" };
  if (s === "warn") return { bg: "rgba(180,140,58,0.14)", color: "#8B6914", label: "Atenção" };
  if (s === "fail") return { bg: "rgba(160,60,50,0.12)", color: "#9B3A2E", label: "Falha" };
  return { bg: "rgba(58,51,39,0.08)", color: "rgba(58,51,39,0.6)", label: "Verificando" };
}

export default function AuthDiagnostics() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<Check[]>([
    { id: "tenant", label: "Conexão ao projeto Sommelyx", status: "pending" },
    { id: "storage", label: "Storage de sessão acessível", status: "pending" },
    { id: "session", label: "Sessão atual válida", status: "pending" },
    { id: "crypto", label: "Web Crypto API disponível", status: "pending" },
    { id: "ping", label: "Conectividade com o backend", status: "pending" },
  ]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const projectRef = useMemo(() => {
    try {
      const u = new URL(SUPABASE_URL);
      return u.hostname.split(".")[0];
    } catch {
      return "—";
    }
  }, []);

  const runDiagnostics = async () => {
    setRunning(true);
    setLastError(null);
    const next: Check[] = [];

    // 1. Tenant
    next.push({
      id: "tenant",
      label: "Conexão ao projeto Sommelyx",
      status: projectRef === EXPECTED_REF ? "ok" : "fail",
      detail: `Tenant atual: ${projectRef} · esperado: ${EXPECTED_REF}`,
    });

    // 2. Storage
    let storageOk = false;
    let storageDetail = "";
    try {
      const probeKey = "__sommelyx_probe__";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      storageOk = true;
      storageDetail = raw
        ? `Chave "${STORAGE_KEY}" presente (${raw.length} bytes)`
        : `Chave "${STORAGE_KEY}" vazia (sem sessão persistida)`;
    } catch (e: any) {
      storageDetail = `localStorage bloqueado: ${e?.message || e}`;
    }
    next.push({
      id: "storage",
      label: "Storage de sessão acessível",
      status: storageOk ? "ok" : "fail",
      detail: storageDetail,
    });

    // 3. Session
    let sessionStatus: CheckStatus = "pending";
    let sessionDetail = "";
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        sessionStatus = "fail";
        sessionDetail = error.message;
        setLastError(error.message);
      } else if (data.session) {
        const exp = new Date((data.session.expires_at || 0) * 1000);
        sessionStatus = "ok";
        sessionDetail = `${data.session.user.email || data.session.user.id} · expira ${exp.toLocaleString("pt-BR")}`;
      } else {
        sessionStatus = "warn";
        sessionDetail = "Nenhuma sessão ativa (não autenticado)";
      }
    } catch (e: any) {
      sessionStatus = "fail";
      sessionDetail = e?.message || String(e);
      setLastError(sessionDetail);
    }
    next.push({
      id: "session",
      label: "Sessão atual válida",
      status: sessionStatus,
      detail: sessionDetail,
    });

    // 4. Web Crypto
    const hasCrypto = typeof window.crypto !== "undefined" && !!window.crypto.subtle;
    next.push({
      id: "crypto",
      label: "Web Crypto API disponível",
      status: hasCrypto ? "ok" : "fail",
      detail: hasCrypto
        ? "crypto.subtle disponível (PKCE habilitado)"
        : "crypto.subtle indisponível — exige HTTPS e navegador moderno",
    });

    // 5. Ping
    let pingStatus: CheckStatus = "pending";
    let pingDetail = "";
    try {
      const t0 = performance.now();
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { method: "GET" });
      const dt = Math.round(performance.now() - t0);
      pingStatus = res.ok ? "ok" : "warn";
      pingDetail = `HTTP ${res.status} em ${dt}ms`;
    } catch (e: any) {
      pingStatus = "fail";
      pingDetail = `Falha de rede: ${e?.message || e}`;
    }
    next.push({
      id: "ping",
      label: "Conectividade com o backend",
      status: pingStatus,
      detail: pingDetail,
    });

    setChecks(next);
    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleClearStorage = async () => {
    try {
      // Sign out (best-effort)
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      // Wipe sommelyx + supabase keys
      const removed: string[] = [];
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("sommelyx.") || k.startsWith("sb-") || k.includes("supabase")) {
          window.localStorage.removeItem(k);
          removed.push(k);
        }
      }
      try {
        window.sessionStorage.clear();
      } catch {
        /* ignore */
      }
      toast({
        title: "Storage limpo",
        description: removed.length
          ? `${removed.length} chaves removidas. Recarregue a página.`
          : "Nenhuma chave de sessão encontrada. Recarregue a página.",
      });
      runDiagnostics();
    } catch (e: any) {
      toast({
        title: "Erro ao limpar storage",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const showKeyTypeHelp =
    !!lastError &&
    /no suitable key|wrong key type|key.*type/i.test(lastError);

  return (
    <div className="min-h-screen bg-[#F4F1EC] px-5 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(58,51,39,0.5)]">
            Sommelyx · Suporte
          </p>
          <h1
            className="text-[28px] font-semibold tracking-[-0.02em] text-[#1a1713]"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            Diagnóstico de autenticação
          </h1>
          <p className="text-[13px] text-[rgba(58,51,39,0.7)]">
            Verifica conexão ao projeto, integridade do storage de sessão e identifica problemas comuns
            como o erro <em>"No suitable key or wrong key type"</em>.
          </p>
        </header>

        {/* Tenant card */}
        <section className="rounded-[20px] border border-[rgba(95,111,82,0.12)] bg-white/82 p-5 shadow-[0_8px_24px_-18px_rgba(58,51,39,0.18)] backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.5)]">
            Tenant atual
          </p>
          <p className="mt-1 break-all font-mono text-[13px] text-[#1a1713]">{SUPABASE_URL}</p>
          <p className="mt-1 text-[11px] text-[rgba(58,51,39,0.6)]">
            project_ref: <span className="font-mono">{projectRef}</span>
          </p>
        </section>

        {/* Checks */}
        <section className="space-y-2">
          {checks.map((c) => {
            const palette = statusColor(c.status);
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-[16px] border border-[rgba(95,111,82,0.1)] bg-white/76 px-4 py-3 backdrop-blur-sm"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1713]">{c.label}</p>
                  {c.detail && (
                    <p className="mt-0.5 break-all text-[11.5px] text-[rgba(58,51,39,0.65)]">
                      {c.detail}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{ background: palette.bg, color: palette.color }}
                >
                  {palette.label}
                </span>
              </div>
            );
          })}
        </section>

        {/* Key-type error helper */}
        {showKeyTypeHelp && (
          <section className="rounded-[20px] border border-[rgba(160,60,50,0.22)] bg-[rgba(160,60,50,0.06)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9B3A2E]">
              Erro detectado · No suitable key or wrong key type
            </p>
            <p
              className="mt-1 text-[16px] font-semibold text-[#1a1713]"
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
            >
              Sua sessão local está corrompida
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[rgba(58,51,39,0.78)]">
              Esse erro ocorre quando o token armazenado no navegador foi gerado por uma versão anterior
              do app ou por outro tenant. A correção é limpar o storage de autenticação e fazer login
              novamente.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[12.5px] text-[rgba(58,51,39,0.78)]">
              <li>Clique em <strong>"Limpar storage de sessão"</strong> abaixo.</li>
              <li>Recarregue a página (Ctrl/Cmd + R).</li>
              <li>Acesse <Link to="/login" className="underline">/login</Link> e entre novamente.</li>
            </ol>
          </section>
        )}

        {/* Generic instructions */}
        <section className="rounded-[20px] border border-[rgba(95,111,82,0.12)] bg-white/76 p-5 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.5)]">
            Quando usar este diagnóstico
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] text-[rgba(58,51,39,0.78)]">
            <li>Erros de login que persistem após várias tentativas.</li>
            <li>Mensagem <em>"No suitable key or wrong key type"</em>.</li>
            <li>Sessão que expira inesperadamente ou loops de redirecionamento para /login.</li>
            <li>Após trocar de domínio (preview ↔ publicado).</li>
          </ul>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            onClick={runDiagnostics}
            disabled={running}
            className="rounded-full bg-[#1a1713] text-white hover:bg-[#2a241f]"
          >
            {running ? "Verificando..." : "Rodar diagnóstico novamente"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearStorage}
            className="rounded-full border-[rgba(160,60,50,0.3)] text-[#9B3A2E] hover:bg-[rgba(160,60,50,0.06)]"
          >
            Limpar storage de sessão
          </Button>
          <Button
            type="button"
            variant="ghost"
            asChild
            className="rounded-full text-[rgba(58,51,39,0.7)]"
          >
            <Link to="/login">Voltar para login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
