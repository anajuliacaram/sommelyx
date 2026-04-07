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

export default function DashboardLayout() {
  const { user, profileType } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = drinkNow + lowStock;
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
      <div className="dashboard-shell min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 md:h-13 flex items-center px-3 md:px-5 gap-2 md:gap-3 sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border/25">
            <SidebarTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-xl [&>svg]:h-4.5 [&>svg]:w-4.5 text-muted-foreground hover:text-foreground",
              )}
            />

            <div className="flex-1 flex items-center justify-start md:justify-center px-1 md:px-3">
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

            <div className="flex items-center gap-1.5 md:gap-2">
              <span
                className="hidden sm:inline-flex items-center h-6 px-2.5 rounded-md text-[9px] font-bold uppercase tracking-[0.10em] shrink-0 whitespace-nowrap"
                style={{
                  background: profileType === "commercial" ? "hsl(var(--gold) / 0.06)" : "hsl(var(--primary) / 0.05)",
                  color: profileType === "commercial" ? "hsl(var(--gold))" : "hsl(var(--primary))",
                  border: `1px solid ${profileType === "commercial" ? "hsl(var(--gold) / 0.15)" : "hsl(var(--primary) / 0.10)"}`,
                }}
              >
                {profileType === "commercial" ? "Comercial" : "Pessoal"}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard/alerts")}
                className="h-9 w-9 rounded-xl relative text-muted-foreground hover:bg-muted/25"
                title="Alertas"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white bg-destructive">
                    {alertCount}
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="icon"
                className="h-9 w-9 rounded-xl p-0 font-bold shadow-premium text-[11px]"
                onClick={() => navigate("/dashboard/settings")}
              >
                {initials}
              </Button>
            </div>
          </header>

          <div className="flex-1 px-3 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:p-4 lg:p-5">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
    </SidebarProvider>
  );
}
