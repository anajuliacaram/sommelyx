import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } }),
} as const;

export default function SettingsPage() {
  const { user, profileType, setProfileType } = useAuth();
  const { toast } = useToast();

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
      toast({ title: "Erro ao trocar perfil", variant: "destructive" });
    } finally {
      setSwitchTarget(null);
    }
  };

  return (
    <div className="space-y-7 max-w-2xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="section-surface section-surface--full">
          <div className="flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="t-title">Configurações</h1>
          </div>
          <p className="t-subtitle mt-1.5">Gerencie seu perfil e preferências da conta</p>
        </div>
      </motion.div>

      {/* Profile */}
      <motion.div className="glass-card p-6 space-y-5" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
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
      </motion.div>

      {/* Notifications */}
      <motion.div className="glass-card p-6 space-y-5" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
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
      </motion.div>

      {/* Account Type */}
      <motion.div className="glass-card p-6 space-y-5 pb-7" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
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
            const isLight = opt.type === "personal";
            const txt = isLight ? "#2B2B2B" : "#F8F6F3";

            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleProfileSwitch(opt.type)}
                className={cn(
                  "relative rounded-2xl overflow-hidden text-left transition-all duration-300 flex flex-col items-start justify-start p-5",
                  "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isLight
                    ? "bg-[#F8F6F3] shadow-[0_20px_60px_-40px_rgba(44,20,31,0.35)] ring-1 ring-black/[0.06]"
                    : "bg-[linear-gradient(180deg,#2B2B2B_0%,#1F1C20_55%,#171518_100%)] shadow-[0_20px_60px_-40px_rgba(15,15,20,0.60)] ring-1 ring-white/[0.08]",
                  isActive && (isLight
                    ? "ring-2 ring-primary/30 shadow-[0_24px_70px_-40px_rgba(44,20,31,0.45)]"
                    : "ring-2 ring-[#C6A768]/40 shadow-[0_24px_70px_-40px_rgba(15,15,20,0.70)]"),
                )}
              >
                {/* Radial overlays */}
                {isLight ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.10),transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_35%,rgba(198,167,104,0.10),transparent_55%)]" />
                  </>
                ) : (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(110,30,42,0.35),transparent_60%)]" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(198,167,104,0.18),transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(198,167,104,0.65),transparent)]" />
                  </>
                )}

                <div className="relative flex items-center gap-3 w-full">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isLight
                        ? "bg-[#6E1E2A]/8 ring-1 ring-[#6E1E2A]/12"
                        : "bg-white/10 ring-1 ring-white/10",
                    )}
                  >
                    <opt.icon className={cn("h-4 w-4", isLight ? "text-[#6E1E2A]/70" : "text-[#C6A768]/80")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold leading-snug tracking-[-0.015em] truncate" style={{ color: txt }}>
                      {opt.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug" style={{ color: isLight ? "rgba(43,43,43,0.7)" : "rgba(248,246,243,0.7)" }}>
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="relative mt-3 w-full">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
                        isLight
                          ? "text-[#6E1E2A] ring-1 ring-[#6E1E2A]/15 bg-[linear-gradient(135deg,rgba(110,30,42,0.07),rgba(198,167,104,0.14))]"
                          : "text-[#F8F6F3] ring-1 ring-[#C6A768]/30 bg-[linear-gradient(135deg,rgba(198,167,104,0.18),rgba(110,30,42,0.15))]",
                      )}
                    >
                      <Check className={cn("h-2.5 w-2.5", isLight ? "text-[#6E1E2A]/80" : "text-[#C6A768]")} strokeWidth={2.5} />
                      Ativo
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Save button */}
      <motion.div className="pt-2" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <Button
          onClick={handleSaveProfile}
          variant="primary"
          className="h-11 w-full sm:w-auto px-8 text-[12px] font-black uppercase tracking-[0.12em] shadow-float"
          disabled={saving}
        >
          {saved ? <Check className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </motion.div>

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
