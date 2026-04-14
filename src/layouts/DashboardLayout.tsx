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
  const topbarSurface = "rgba(255, 255, 255, 0.72)";

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="dashboard-shell h-dvh overflow-hidden flex w-full">
        <AppSidebar />
        <main className="flex-1 flex h-full flex-col min-w-0 overflow-hidden">
          <header
            className="relative isolate h-14 flex items-center px-5 md:px-7 gap-3 sticky top-0 z-30 border-b overflow-hidden"
            style={{
              background: topbarSurface,
              backdropFilter: "blur(14px) saturate(1.05)",
              WebkitBackdropFilter: "blur(24px) saturate(1.1)",
              borderColor: "rgba(255, 255, 255, 0.18)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 12px 28px -18px rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Desktop: icon-only trigger */}
            <div className="relative z-10 flex items-center gap-3 w-full">
              {/* Desktop: icon-only trigger */}
              {!isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "rounded-xl h-10 w-10 border border-white/20 bg-[rgba(248,245,240,0.8)] text-[hsl(var(--wine))] shadow-[0_6px_18px_-12px_rgba(0,0,0,0.25)] hover:bg-[rgba(248,245,240,0.9)] hover:text-[hsl(var(--wine))] hover:border-white/30 [&>svg]:h-4 [&>svg]:w-4",
                  )}
                />
              )}

              {/* Mobile: larger, labeled trigger */}
              {isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "rounded-xl h-11 min-w-[80px] px-3 gap-2 border border-white/20 bg-[rgba(248,245,240,0.82)] text-[hsl(var(--wine))] shadow-[0_6px_18px_-12px_rgba(0,0,0,0.25)] hover:bg-[rgba(248,245,240,0.92)] hover:text-[hsl(var(--wine))] hover:border-white/30 active:scale-95 transition-transform duration-150 [&>svg]:h-5 [&>svg]:w-5",
                  )}
                >
                  <span className="text-[13px] font-semibold leading-none">Menu</span>
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
                  className={[
                    "hidden sm:inline-flex items-center h-7 px-3 rounded-lg text-[11px] font-extrabold uppercase tracking-[0.08em] shrink-0 whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                    profileType === "commercial"
                      ? "bg-[rgba(198,167,104,0.24)] text-[#1E1811] ring-1 ring-[rgba(198,167,104,0.30)]"
                      : "bg-[rgba(110,30,42,0.22)] text-[#FAF7F2] ring-1 ring-[rgba(110,30,42,0.30)]",
                  ].join(" ")}
                >
                  {profileType === "commercial" ? "COMERCIAL" : "PESSOAL"}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAlertsOpen(true)}
                  className="h-10 w-10 rounded-xl relative text-muted-foreground hover:bg-muted/20"
                  title="Alertas"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {alertCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-destructive shadow-sm">
                      {alertCount}
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="icon"
                  className="h-10 w-10 rounded-xl p-0 text-[12px] font-semibold"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  {initials}
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] md:px-7 lg:px-10">
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
