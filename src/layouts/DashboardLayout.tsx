import { useNavigate } from "react-router-dom";
import { AnimatedOutlet } from "@/components/AnimatedOutlet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "@/icons/lucide";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { useWineMetrics, useWines } from "@/hooks/useWines";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardCommandMenu } from "@/components/DashboardCommandMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertsSheet } from "@/components/AlertsSheet";

export default function DashboardLayout() {
  const { user, profileType } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = drinkNow + (profileType === "commercial" ? lowStock : 0);
  const isMobile = useIsMobile();

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="dashboard-shell h-dvh overflow-hidden flex w-full relative">
        <AppSidebar />
        <main className="flex-1 flex h-full flex-col min-w-0 overflow-hidden">
          <header
            className="relative isolate h-16 flex items-center px-5 md:px-7 gap-4 sticky top-0 z-30 overflow-hidden border-b border-[rgba(95,111,82,0.08)] bg-[rgba(248,245,239,0.78)] backdrop-blur-xl shadow-[0_10px_24px_-22px_rgba(58,51,39,0.18)]"
          >
            <div className="relative z-10 flex items-center gap-3 w-full">
              {!isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "group relative rounded-xl h-10 w-10 p-0",
                    "border border-[rgba(123,30,43,0.18)]",
                    "bg-gradient-to-br from-[#7B1E2B] to-[#5A1420] text-white",
                    "shadow-[0_2px_6px_rgba(123,30,43,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]",
                    "hover:from-[#8B2333] hover:to-[#6A1820] hover:shadow-[0_4px_12px_rgba(123,30,43,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]",
                    "active:scale-[0.96] transition-all duration-200",
                    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white/95 [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:scale-110",
                    "after:absolute after:top-1.5 after:right-1.5 after:h-1.5 after:w-1.5 after:rounded-full after:bg-[#C9B469] after:shadow-[0_0_4px_rgba(201,180,105,0.6)]",
                  )}
                />
              )}

              {isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "group relative rounded-xl h-10 min-w-[88px] px-3.5 gap-2",
                    "border border-[rgba(123,30,43,0.18)]",
                    "bg-gradient-to-br from-[#7B1E2B] to-[#5A1420] text-white",
                    "shadow-[0_2px_6px_rgba(123,30,43,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]",
                    "hover:from-[#8B2333] hover:to-[#6A1820]",
                    "active:scale-95 transition-all duration-200",
                    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white/95",
                  )}
                >
                  <span className="text-[13px] font-semibold tracking-[-0.005em] leading-none text-white">Menu</span>
                </SidebarTrigger>
              )}

              <div className="flex-1 flex items-center justify-start md:justify-center px-1 md:px-4">
                <DashboardCommandMenu
                  profileType={profileType}
                  wines={wines ?? []}
                  alertCount={alertCount}
                  onAddWine={() => setAddOpen(true)}
                  onImportCsv={() =>
                    navigate(profileType === "commercial" ? "/dashboard/inventory" : "/dashboard/cellar")
                  }
                  onRegisterOpen={() => {
                    setManageTab("open");
                    setManageOpen(true);
                  }}
                  onRegisterExit={() => {
                    setManageTab("exit");
                    setManageOpen(true);
                  }}
                  onRegisterSale={profileType === "commercial" ? () => navigate("/dashboard/sales") : undefined}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center h-7 px-3 shrink-0 whitespace-nowrap rounded-full text-[10px] font-bold uppercase tracking-[0.08em]",
                    profileType === "commercial"
                      ? "bg-[rgba(95,111,82,0.10)] text-[hsl(var(--primary))] border border-[rgba(95,111,82,0.14)]"
                      : "bg-[rgba(95,111,82,0.10)] text-[hsl(var(--primary))] border border-[rgba(95,111,82,0.14)]",
                  )}
                >
                  {profileType === "commercial" ? "COMERCIAL" : "PESSOAL"}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAlertsOpen(true)}
                  className={cn(
                    "group relative h-10 w-10 rounded-xl p-0",
                    "border border-[rgba(123,30,43,0.18)]",
                    "bg-gradient-to-br from-[#7B1E2B] to-[#5A1420] text-white",
                    "shadow-[0_2px_6px_rgba(123,30,43,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]",
                    "hover:from-[#8B2333] hover:to-[#6A1820] hover:text-white",
                    "hover:shadow-[0_4px_12px_rgba(123,30,43,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]",
                    "active:scale-[0.96] transition-all duration-200",
                  )}
                  title="Alertas"
                >
                  <Bell className="h-4 w-4 text-white/95 transition-transform duration-200 group-hover:scale-110" />
                  {alertCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-[#1A1713] bg-[#C9B469] shadow-[0_0_6px_rgba(201,180,105,0.55)] ring-2 ring-[#5A1420]">
                      {alertCount}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#C9B469] shadow-[0_0_4px_rgba(201,180,105,0.6)]" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="icon"
                  className="h-9 w-9 rounded-xl p-0 text-[11px] font-semibold shadow-[0_10px_24px_-18px_hsl(var(--primary)/0.26)]"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  {initials}
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-6 pb-[calc(18px+env(safe-area-inset-bottom))] md:px-7 lg:px-10">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
      <AlertsSheet open={alertsOpen} onOpenChange={setAlertsOpen} profileType={profileType} />
    </SidebarProvider>
  );
}
