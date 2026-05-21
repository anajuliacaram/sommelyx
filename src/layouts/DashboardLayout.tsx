import { useNavigate } from "react-router-dom";
import { AnimatedOutlet } from "@/components/AnimatedOutlet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback, useMemo } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { useWineMetrics, useWines } from "@/hooks/useWines";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardCommandMenu } from "@/components/DashboardCommandMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import { LandingBackground } from "@/components/landing/LandingBackground";

export default function DashboardLayout() {
  const { user, profileType, signOut } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = useMemo(() => drinkNow + (profileType === "commercial" ? lowStock : 0), [drinkNow, lowStock, profileType]);
  const isMobile = useIsMobile();

  const handleAddWine = useCallback(() => setAddOpen(true), []);
  const handleImportCsv = useCallback(
    () => navigate(profileType === "commercial" ? "/dashboard/inventory" : "/dashboard/cellar"),
    [navigate, profileType],
  );
  const handleRegisterOpen = useCallback(() => {
    setManageTab("open");
    setManageOpen(true);
  }, []);
  const handleRegisterExit = useCallback(() => {
    setManageTab("exit");
    setManageOpen(true);
  }, []);
  const handleRegisterSale = useCallback(
    () => profileType === "commercial" && navigate("/dashboard/sales"),
    [navigate, profileType],
  );
  const handleOpenAccount = useCallback(() => setAccountOpen((open) => !open), []);
  const handleProfileClick = useCallback(() => {
    setAccountOpen(false);
    navigate("/dashboard/settings#perfil");
  }, [navigate]);
  const handleSettingsClick = useCallback(() => {
    setAccountOpen(false);
    navigate("/dashboard/settings#preferencias");
  }, [navigate]);
  const handleSignOut = useCallback(() => {
    setAccountOpen(false);
    void signOut();
  }, [signOut]);

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div
        className="dashboard-shell h-dvh overflow-hidden flex w-full relative app-background"
        data-theme={profileType === "commercial" ? "business" : undefined}
      >
        <LandingBackground />
        <AppSidebar />
        <main className="flex-1 flex h-full flex-col min-w-0 overflow-hidden">
          <header
            className="mobile-header sx-mobile-header relative isolate sticky top-0 z-30 flex h-[60px] items-center gap-2.5 overflow-hidden border-b border-[var(--sx-b-default)] bg-[rgba(242,239,233,0.85)] px-4 backdrop-blur-[8px] md:px-6"
          >
            <div className="relative z-10 flex items-center gap-3 w-full">
              {!isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "mobile-header-menu group relative h-9.5 w-9.5 rounded-[var(--sx-r-md)] bg-[var(--sx-bordeaux)] p-0 text-[var(--sx-t-white)] shadow-[0_4px_16px_rgba(139,26,59,0.24)] transition-all duration-150 hover:bg-[var(--sx-bordeaux)] hover:opacity-90 active:scale-[0.96]",
                    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white",
                  )}
                />
              )}

              {isMobile && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "mobile-header-menu h-9.5 min-w-[84px] gap-[7px] rounded-[var(--sx-r-md)] bg-[var(--sx-bordeaux)] px-3.5 text-[13px] font-medium text-[var(--sx-t-white)] shadow-[0_4px_16px_rgba(139,26,59,0.24)] transition-all duration-150 hover:bg-[var(--sx-bordeaux)] hover:opacity-90 active:scale-95",
                    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white",
                  )}
                >
                  <span className="text-[13px] font-medium leading-none text-white">Menu</span>
                </SidebarTrigger>
              )}

              <div className="flex-1 flex items-center justify-start md:justify-center px-1 md:px-4">
                <DashboardCommandMenu
                  profileType={profileType}
                  wines={wines ?? []}
                  alertCount={alertCount}
                  onAddWine={handleAddWine}
                  onImportCsv={handleImportCsv}
                  onRegisterOpen={handleRegisterOpen}
                  onRegisterExit={handleRegisterExit}
                  onRegisterSale={profileType === "commercial" ? handleRegisterSale : undefined}
                />
              </div>

              <div className="flex items-center gap-2.5">
                {profileType === "commercial" ? (
                  <span className="business-mode-badge hidden sm:inline-flex">Business</span>
                ) : null}

                <Button
                  type="button"
                  variant="primary"
                  size="icon"
                  className={cn(
                    "header-avatar h-9 w-9 rounded-[var(--sx-r-md)] border-0 bg-[var(--sx-bordeaux)] p-0 text-[13px] font-semibold text-[var(--sx-t-white)] shadow-none hover:bg-[var(--sx-bordeaux)] hover:opacity-90",
                    accountOpen && "ring-2 ring-[rgba(139,26,59,0.18)]",
                  )}
                  onClick={handleOpenAccount}
                  aria-haspopup="dialog"
                  aria-expanded={accountOpen}
                  aria-label="Abrir menu da conta"
                >
                  {initials}
                </Button>
              </div>
            </div>
          </header>

          <div className="dashboard-scroll flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] md:px-6 md:pt-3 lg:px-8">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
      <UserAccountMenu
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={user?.user_metadata?.full_name || user?.email || "Usuário"}
        email={user?.email}
        initials={initials}
        onProfile={handleProfileClick}
        onSettings={handleSettingsClick}
        onSignOut={handleSignOut}
      />
      
    </SidebarProvider>
  );
}
