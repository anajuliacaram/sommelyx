import { LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, Wine, Camera, PenLine, AlertTriangle, ClipboardList, UtensilsCrossed, Sparkles } from "@/icons/lucide";
import { NavLink } from "@/components/NavLink";
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
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(246, 242, 234, 0.96) 100%)",
          backdropFilter: "blur(12px) saturate(1.02)",
          WebkitBackdropFilter: "blur(12px) saturate(1.02)",
          borderColor: "rgba(95, 111, 82, 0.10)",
          boxShadow: "0 28px 60px -44px rgba(58, 51, 39, 0.32)",
        }}
      >
        <SidebarHeader className="pt-4 md:pt-4 px-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex w-full items-center gap-4 px-4 py-4 mb-3 rounded-[22px] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15 overflow-hidden"
            aria-label="Ir para o início do dashboard"
            style={{
              background: "linear-gradient(135deg, rgba(21, 33, 25, 0.98) 0%, rgba(37, 51, 41, 0.97) 48%, rgba(24, 35, 27, 0.98) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(8px) saturate(1.02)",
              WebkitBackdropFilter: "blur(8px) saturate(1.02)",
              boxShadow: "0 20px 38px -28px rgba(12, 18, 14, 0.72)",
            }}
          >
            <div className="flex items-center gap-2">
              <img src="/logo-sommelyx-mark.png" className="w-20 h-20 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] px-0 ml-0 text-left" alt="Sommelyx" />

              <div className="flex flex-col text-left mx-0 ml-0">
                <span
                  className="text-[22px] font-bold tracking-tight text-white leading-none"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  Sommelyx
                </span>

                <span className="mt-1.5 text-[10px] font-semibold tracking-[0.12em] py-[3px] rounded-full bg-white/12 text-white/80 backdrop-blur-sm w-fit px-0">
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
                  className="w-full h-12 text-[14px] font-semibold rounded-[18px] gap-1.5 px-4 shadow-[0_14px_28px_-18px_hsl(var(--primary)/0.30)] hover:shadow-[0_18px_34px_-18px_hsl(var(--primary)/0.34)]"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-[15px] w-[15px] shrink-0" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="ghost"
                  className="group w-full h-11 bg-gradient-to-br from-[#7B1E2B] to-[#5A1420] hover:from-[#8E2433] hover:to-[#6A1826] text-white rounded-2xl shadow-[0_10px_28px_-12px_rgba(123,30,43,0.45)] transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-[14px]"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-[15px] w-[15px] shrink-0 text-white/90 transition-colors group-hover:text-white" />
                  Registrar venda
                </Button>
                <Button
                  variant="ghost"
                  className="group w-full h-10 rounded-[18px] border border-[rgba(95,111,82,0.12)] bg-[rgba(255,255,255,0.80)] text-[13.5px] font-semibold text-neutral-900 gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(255,255,255,0.92)] hover:border-[rgba(95,111,82,0.18)] hover:shadow-[0_8px_20px_-16px_rgba(58,51,39,0.18)] active:translate-y-[0.5px]"
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

        <SidebarContent className="px-3 pt-1">
          <SidebarGroup className="py-0">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold mb-1 mt-1 px-3 text-neutral-600">
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

          <SidebarGroup className="mt-3">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold mb-2 px-3 text-neutral-600">
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
              <div className="px-3 pt-4 pb-[calc(14px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--forest-light)))",
                  color: "#F7F4EE",
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate text-neutral-900">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[11px] truncate text-neutral-600">{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item !h-[38px] !text-[12px] hover:!bg-red-500/10 hover:!text-red-600 hover:!border-red-500/15"
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
