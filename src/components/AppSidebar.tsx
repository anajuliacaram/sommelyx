import { LayoutDashboard, GlassWater, Heart, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, AlertTriangle, ClipboardList, Wine } from "@/icons/lucide";
import { NavLink } from "@/components/NavLink";
import { BrandName } from "@/components/BrandName";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { BreakageDialog } from "@/components/BreakageDialog";
import { SaleDialog } from "@/components/SaleDialog";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { QuickActions } from "@/components/QuickActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
}

const personalMenu: MenuItem[] = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Adega", url: "/dashboard/cellar", icon: GlassWater },
  { title: "Meu Consumo", url: "/dashboard/consumption", icon: Wine },
  { title: "Alertas", url: "/dashboard/alerts", icon: Bell },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
];

const commercialMenu: MenuItem[] = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Vendas", url: "/dashboard/sales", icon: ShoppingCart },
  { title: "Cadastros", url: "/dashboard/registers", icon: Users },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
  { title: "Histórico", url: "/dashboard/log", icon: ClipboardList },
];

export function AppSidebar() {
  const { profileType, signOut, user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [addOpen, setAddOpen] = useState(false);
  const [addWithScan, setAddWithScan] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [breakageOpen, setBreakageOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [dishToWineOpen, setDishToWineOpen] = useState(false);
  const [wineListScanOpen, setWineListScanOpen] = useState(false);
  const menu = profileType === "commercial" ? commercialMenu : personalMenu;
  const isCommercial = profileType === "commercial";

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };
  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <>
      <Sidebar
        collapsible="offcanvas"
        className="w-[256px]"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 243, 236, 0.94) 100%)",
          backdropFilter: "blur(16px) saturate(1.02)",
          WebkitBackdropFilter: "blur(16px) saturate(1.02)",
          borderColor: "rgba(58, 51, 39, 0.06)",
          boxShadow: "0 26px 58px -46px rgba(58, 51, 39, 0.24)",
        }}
      >
        <SidebarHeader className="pt-4 md:pt-4 px-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex w-full items-center gap-4 px-4 py-4 mb-2 rounded-[20px] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15 overflow-hidden"
            aria-label="Ir para o início do dashboard"
            style={{
              background: "linear-gradient(135deg, #3A4A2E 0%, #4A5E38 52%, #2F3F26 100%)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(8px) saturate(1.02)",
              WebkitBackdropFilter: "blur(8px) saturate(1.02)",
              boxShadow: "0 18px 34px -28px rgba(58, 74, 46, 0.48)",
            }}
          >
            <div className="flex items-center gap-0">
              <img src="/logo-sommelyx-mark.png" className="w-20 h-20 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] px-0 ml-0 text-left" alt="Sommelyx" />

              <div className="flex flex-col text-left -ml-3">
                <BrandName tone="light" className="text-[22px] leading-none" />

                <span className="mt-1.5 text-[10px] font-semibold tracking-[0.12em] py-[3px] rounded-full text-white/72 backdrop-blur-sm w-fit px-0">
                  {isCommercial ? "COMERCIAL" : "PESSOAL"}
                </span>
              </div>
            </div>
          </Link>

          {/* CTAs */}
          <div className="px-0 pb-0">
            {isCommercial ? (
              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  className="w-full h-11 text-[13px] font-semibold rounded-[16px] gap-1.5 px-4 shadow-[0_12px_22px_-18px_hsl(var(--primary)/0.26)] hover:shadow-[0_14px_24px_-20px_hsl(var(--primary)/0.3)]"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-[15px] w-[15px] shrink-0" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="ghost"
                  className="group w-full h-10.5 bg-gradient-to-br from-[#7B1E2B] to-[#5A1420] hover:from-[#8E2433] hover:to-[#6A1826] text-white rounded-[16px] shadow-[0_8px_18px_-12px_rgba(123,30,43,0.32)] transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-2 font-semibold text-[13px]"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-[15px] w-[15px] shrink-0 text-white/90 transition-colors group-hover:text-white" />
                  Registrar venda
                </Button>
                <Button
                  variant="ghost"
                  className="group w-full h-9.5 rounded-[16px] gap-1.5 px-4 text-[12.5px] font-semibold tracking-[-0.01em] text-[rgba(36,30,24,0.82)] transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-[0.5px]"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <AlertTriangle className="h-[15px] w-[15px] shrink-0 text-[#B7791F] transition-colors group-hover:text-[#C98922]" />
                  Ruptura
                </Button>
              </div>
            ) : (
              <QuickActions
                variant={isCommercial ? "commercial" : "personal"}
                layout="stacked"
                onAddWine={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                onRegisterConsumption={() => { setManageOpen(true); setManageTab("open"); closeMobileSidebar(); }}
                onHarmonize={() => { setDishToWineOpen(true); closeMobileSidebar(); }}
                onAnalyzeList={() => { setWineListScanOpen(true); closeMobileSidebar(); }}
              />
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 pt-1 gap-0">
          <SidebarGroup className="py-0">
            <SidebarGroupLabel className="text-[9px] md:text-[9px] max-md:text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 mt-2 px-3 text-[rgba(72,60,46,0.54)]">
              {isCommercial ? "Operação" : "Navegação"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {menu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="sidebar-item"
                        activeClassName="sidebar-item--active"
                        onClick={closeMobileSidebar}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-0 py-0">
            <SidebarGroupLabel className="text-[9px] md:text-[9px] max-md:text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 mt-2 px-3 text-[rgba(72,60,46,0.54)]">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/settings" className="sidebar-item" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/plans" className="sidebar-item" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Meu Plano</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-3 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item md:!h-[38px] md:!text-[12px] hover:!bg-red-500/10 hover:!text-red-600 hover:!border-red-500/15"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <AddWineDialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setAddWithScan(false); }} initialScan={addWithScan} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
      <BreakageDialog open={breakageOpen} onOpenChange={setBreakageOpen} />
      <SaleDialog open={saleOpen} onOpenChange={setSaleOpen} />
      <DishToWineDialog open={dishToWineOpen} onOpenChange={setDishToWineOpen} />
      <WineListScannerDialog open={wineListScanOpen} onOpenChange={setWineListScanOpen} />
    </>
  );
}
