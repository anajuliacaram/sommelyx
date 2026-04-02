import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, Bell, Building2, Save, Check, AlertTriangle } from "@/icons/lucide";
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
    <div className="space-y-6 max-w-2xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" style={{ color: "#8F2D56" }} />
          <h1 className="text-xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>Configurações</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
      </motion.div>

      {/* Profile */}
      <motion.div className="glass-card p-6 space-y-5" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4" style={{ color: "#8F2D56" }} />
          <h2 className="text-[15px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Perfil</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1 opacity-60" />
            <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>O email não pode ser alterado por aqui.</p>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div className="glass-card p-6 space-y-5" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4" style={{ color: "#8F2D56" }} />
          <h2 className="text-[15px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Notificações</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#0F0F14" }}>Janela de consumo</p>
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>Avisar quando vinhos entrarem na janela ideal</p>
            </div>
            <Switch checked={notifDrinkWindow} onCheckedChange={setNotifDrinkWindow} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#0F0F14" }}>Estoque baixo</p>
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>Avisar quando um vinho tiver 2 ou menos garrafas</p>
            </div>
            <Switch checked={notifLowStock} onCheckedChange={setNotifLowStock} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#0F0F14" }}>Relatórios semanais</p>
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>Receber resumo semanal por email</p>
            </div>
            <Switch checked={notifReports} onCheckedChange={setNotifReports} />
          </div>
        </div>
      </motion.div>

      {/* Account Type */}
      <motion.div className="glass-card p-6 space-y-5" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4" style={{ color: "#8F2D56" }} />
          <h2 className="text-[15px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Tipo de conta</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() => handleProfileSwitch("personal")}
            variant="outline"
            className={cn(
              "h-auto w-full flex-col justify-start items-start p-4 rounded-2xl text-left transition-all gap-1",
              profileType === "personal"
                ? "bg-primary/5 border-primary/25 shadow-sm"
                : "bg-background/60 border-border/60 hover:bg-background",
            )}
          >
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "#0F0F14" }}>🍷 Adega Pessoal</p>
            <p className="text-[11px] leading-snug" style={{ color: "#6B7280" }}>Para colecionadores e entusiastas</p>
            {profileType === "personal" && <Check className="h-4 w-4 mt-2" style={{ color: "#8F2D56" }} />}
          </Button>
          <Button
            type="button"
            onClick={() => handleProfileSwitch("commercial")}
            variant="outline"
            className={cn(
              "h-auto w-full flex-col justify-start items-start p-4 rounded-2xl text-left transition-all gap-1",
              profileType === "commercial"
                ? "bg-primary/5 border-primary/25 shadow-sm"
                : "bg-background/60 border-border/60 hover:bg-background",
            )}
          >
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "#0F0F14" }}>🏪 Operação Comercial</p>
            <p className="text-[11px] leading-snug" style={{ color: "#6B7280" }}>Para bares, restaurantes e lojas</p>
            {profileType === "commercial" && <Check className="h-4 w-4 mt-2" style={{ color: "#8F2D56" }} />}
          </Button>
        </div>
      </motion.div>

      {/* Save button */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
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
