import { useState, useEffect } from "react";
import { Settings, User, Bell, Building2, Save, Check, AlertTriangle, Wine } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } }),
} as const;

export default function SettingsPage() {
  const { user, profileType, setProfileType } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notification prefs (local state — MVP)
  const [notifDrinkWindow, setNotifDrinkWindow] = useState(true);
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifReports, setNotifReports] = useState(false);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || "");
    // Load notification prefs from localStorage
    const prefs = localStorage.getItem("sommelyx_notif_prefs");
    if (prefs) {
      const p = JSON.parse(prefs);
      setNotifDrinkWindow(p.drinkWindow ?? true);
      setNotifLowStock(p.lowStock ?? true);
      setNotifReports(p.reports ?? false);
    }
  }, [user]);

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.slice(1);
    if (!targetId) return;
    const run = () => {
      const el = document.getElementById(targetId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(run);
    }
  }, [location.hash]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const nextName = fullName.trim().replace(/\s+/g, " ");
      if (!nextName) throw new Error("Nome completo é obrigatório");
      if (nextName.length > 120) throw new Error("Nome completo é muito longo");
      // Update auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: nextName },
      });
      if (authErr) throw authErr;

      // Update profiles table
      if (user) {
        await supabase.from("profiles").update({ full_name: nextName }).eq("user_id", user.id);
      }

      // Save notification prefs
      localStorage.setItem("sommelyx_notif_prefs", JSON.stringify({
        drinkWindow: notifDrinkWindow,
        lowStock: notifLowStock,
        reports: notifReports,
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [switchTarget, setSwitchTarget] = useState<"personal" | "commercial" | null>(null);

  const handleProfileSwitch = async (type: "personal" | "commercial") => {
    if (type === profileType) return;
    setSwitchTarget(type);
  };

  const confirmProfileSwitch = async () => {
    if (!switchTarget) return;
    try {
      await setProfileType(switchTarget);
      toast({ title: `Modo alterado para ${switchTarget === "personal" ? "Adega Pessoal" : "Operação Comercial"}` });
    } catch {
      toast({ title: "Não conseguimos trocar de perfil", description: "Verifique sua conexão e tente novamente. Se persistir, recarregue a página.", variant: "destructive" });
    } finally {
      setSwitchTarget(null);
    }
  };

  return (
    <div className="space-y-7 max-w-2xl">
      <div>
        <div className="section-surface section-surface--full">
          <div className="flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="t-title">Configurações</h1>
          </div>
          <p className="t-subtitle mt-1.5">Gerencie seu perfil e preferências da conta</p>
        </div>
      </div>

      {/* Profile */}
      <div id="perfil" className="glass-card scroll-mt-24 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-semibold font-sans text-foreground">Perfil</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1 opacity-60" />
            <p className="text-[10px] mt-1 text-muted-foreground/60">O email não pode ser alterado por aqui.</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div id="preferencias" className="glass-card scroll-mt-24 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-semibold font-sans text-foreground">Notificações</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">Janela de consumo</p>
              <p className="text-[11px] text-muted-foreground">Avisar quando vinhos entrarem na janela ideal</p>
            </div>
            <Switch checked={notifDrinkWindow} onCheckedChange={setNotifDrinkWindow} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">Estoque baixo</p>
              <p className="text-[11px] text-muted-foreground">Avisar quando um vinho tiver 2 ou menos garrafas</p>
            </div>
            <Switch checked={notifLowStock} onCheckedChange={setNotifLowStock} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-foreground">Relatórios semanais</p>
              <p className="text-[11px] text-muted-foreground">Receber resumo semanal por email</p>
            </div>
            <Switch checked={notifReports} onCheckedChange={setNotifReports} />
          </div>
        </div>
      </div>

      {/* Account Type */}
      <div className="glass-card p-6 space-y-5 pb-7">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-semibold font-sans text-foreground">Tipo de conta</h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Escolha como você usa o Sommelyx
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { type: "personal" as const, icon: Wine, title: "Adega Pessoal", desc: "Para colecionadores e entusiastas." },
            { type: "commercial" as const, icon: Building2, title: "Operação Comercial", desc: "Para bares, restaurantes e lojas." },
          ]).map((opt) => {
            const isActive = profileType === opt.type;

            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleProfileSwitch(opt.type)}
                className={cn(
                  "relative flex flex-col items-start justify-start overflow-hidden rounded-2xl p-5 text-left transition-all duration-300",
                  "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(184,148,60,0.4)]",
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(122,18,36,0.06)",
                        border: "1px solid rgba(122,18,36,0.22)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 12px 28px -18px rgba(122,18,36,0.3)",
                      }
                    : {
                        background: "rgba(255,253,248,0.8)",
                        border: "1px solid rgba(29,21,15,0.1)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(45,27,18,0.04)",
                      }
                }
              >
                <div className="relative flex w-full items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "linear-gradient(160deg, #fff8ec, #f4e9d6)",
                      border: "1px solid rgba(184,148,60,0.3)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                    }}
                  >
                    <opt.icon className="h-4 w-4 text-[#7a1224]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-[14px] font-medium leading-snug tracking-[-0.015em]", isActive ? "text-[#7a1224]" : "text-[#1d150f]")}>
                      {opt.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-[rgba(29,21,15,0.55)]">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="relative mt-3 w-full">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(61,79,53,0.22)] bg-[rgba(61,79,53,0.12)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#2e3d26]">
                      <Check className="h-2.5 w-2.5 text-[#3d4f35]" strokeWidth={2.5} />
                      Ativo
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2">
        <Button
          onClick={handleSaveProfile}
          variant="primary"
          className="h-11 w-full px-8 text-[14px] font-medium sm:w-auto"
          disabled={saving}
        >
          {saved ? <Check className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </div>

      {/* Profile switch confirmation */}
      <AlertDialog open={!!switchTarget} onOpenChange={(open) => { if (!open) setSwitchTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Trocar perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu dashboard e menus serão ajustados para o modo{" "}
              <strong>{switchTarget === "personal" ? "Adega Pessoal" : "Operação Comercial"}</strong>.
              Seus dados de vinhos serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProfileSwitch}>
              Confirmar troca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
