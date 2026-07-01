import { LayoutDashboard, GlassWater, Heart, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, AlertTriangle, ClipboardList, Wine } from "@/icons/lucide";
import { NavLink } from "@/components/NavLink";
import { BrandName } from "@/components/BrandName";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { BreakageDialog } from "@/components/BreakageDialog";
import { SaleDialog } from "@/components/SaleDialog";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { QuickActions } from "@/components/QuickActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "react-router-dom";
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
  navKey: string;
}

const personalMenu: MenuItem[] = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard, navKey: "visao-geral" },
  { title: "Minha Adega", url: "/dashboard/cellar", icon: GlassWater, navKey: "minha-adega" },
  { title: "Meu Consumo", url: "/dashboard/consumption", icon: Wine, navKey: "meu-consumo" },
  { title: "Alertas", url: "/dashboard/alerts", icon: Bell, navKey: "alertas" },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart, navKey: "wishlist" },
];

const commercialMenu: MenuItem[] = [
  { title: "Visão geral", url: "/dashboard", icon: LayoutDashboard, navKey: "visao-geral" },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package, navKey: "minha-adega" },
  { title: "Vendas", url: "/dashboard/sales", icon: ShoppingCart, navKey: "meu-consumo" },
  { title: "Cadastros", url: "/dashboard/registers", icon: Users, navKey: "wishlist" },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText, navKey: "alertas" },
  { title: "Histórico", url: "/dashboard/log", icon: ClipboardList, navKey: "neutral" },
];

export function AppSidebar() {
  const { profileType, signOut, user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const location = useLocation();
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

  useEffect(() => {
    if (!isMobile) return;
    setOpenMobile(false);
  }, [isMobile, location.pathname, location.search, setOpenMobile]);

  return (
    <>
      <Sidebar
        collapsible="offcanvas"
        className="sx-v2-sidebar sx-v6-sidebar w-[216px]"
      >
        <SidebarHeader className="sx-v2-sidebar-header px-0 pt-2">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="sx-v2-sidebar-brand sx-v6-sidebar-brand mx-2.5 mt-0 flex items-center gap-2.5 rounded-[18px] px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(184,148,60,0.4)]"
            aria-label="Ir para o início do dashboard"
          >
            <img src="/logo-sommelyx-mark.png" className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_3px_8px_rgba(26,19,14,0.18)]" alt="Sommelyx" />

            <div className="flex min-w-0 flex-col text-left">
              <BrandName className="sx-v6-sidebar-wordmark text-[19px] font-semibold leading-none tracking-[-0.018em]" />

              <span className="sx-v6-sidebar-profile mt-1 text-[9.5px] font-semibold uppercase tracking-[0.13em]">
                {isCommercial ? "Comercial" : "Pessoal"}
              </span>
            </div>
          </Link>

          {/* CTAs */}
          <div className="sx-v2-sidebar-actions-wrap mx-2.5 my-2">
            {isCommercial ? (
              <div className="sidebar-actions sx-v2-nav-shell sx-v6-actions-shell flex flex-col gap-0.5 rounded-[18px] p-2">
                <Button
                  variant="primary"
                  className="sidebar-action-primary sx-v2-btn-primary h-auto w-full justify-start gap-2.5 rounded-[14px] border-0 px-4 py-3 text-[14px] font-medium"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <span className="action-icon sx-v2-nav-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                    <Plus className="h-[15px] w-[15px] shrink-0" />
                  </span>
                  Cadastrar produto
                </Button>
                <Button
                  variant="ghost"
                  className="sidebar-action-item sx-v2-nav-row group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <span className="action-icon sx-v2-nav-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
                    <ShoppingCart className="h-[15px] w-[15px]" />
                  </span>
                  <span className="sx-v2-nav-label">Registrar venda</span>
                </Button>
                <Button
                  variant="ghost"
                  className="sidebar-action-item sx-v2-nav-row group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <span className="action-icon sx-v2-nav-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
                    <AlertTriangle className="h-[15px] w-[15px]" />
                  </span>
                  <span className="sx-v2-nav-label">Ruptura</span>
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

        <SidebarContent className="sx-v2-sidebar-content gap-0 px-0 pt-1">
          <SidebarGroup className="py-0">
            <SidebarGroupLabel className="sx-v2-sidebar-group-label mb-1.5 mt-3 px-4 text-[10.5px] font-semibold uppercase tracking-[0.10em] text-[var(--sx-t-muted)]">
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
                        className="sidebar-item sx-v2-nav-row"
                        activeClassName="sidebar-item--active sx-v2-nav-row-active"
                        data-nav={item.navKey}
                        onClick={closeMobileSidebar}
                      >
                        <span className="sidebar-item-icon sx-v2-nav-icon">
                          <item.icon className="h-4 w-4 shrink-0" />
                        </span>
                        <span className="sx-v2-nav-label flex-1">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-0 py-0">
            <SidebarGroupLabel className="sx-v2-sidebar-group-label mb-1.5 mt-3 px-4 text-[10.5px] font-semibold uppercase tracking-[0.10em] text-[var(--sx-t-muted)]">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/settings" className="sidebar-item sx-v2-nav-row" activeClassName="sidebar-item--active sx-v2-nav-row-active" data-nav="neutral" onClick={closeMobileSidebar}>
                      <span className="sidebar-item-icon sx-v2-nav-icon">
                        <Settings className="h-4 w-4 shrink-0" />
                      </span>
                      <span className="sx-v2-nav-label">Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/plans" className="sidebar-item sx-v2-nav-row" activeClassName="sidebar-item--active sx-v2-nav-row-active" data-nav="neutral" onClick={closeMobileSidebar}>
                      <span className="sidebar-item-icon sx-v2-nav-icon">
                        <CreditCard className="h-4 w-4 shrink-0" />
                      </span>
                      <span className="sx-v2-nav-label">Meu Plano</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="sx-v2-sidebar-footer">
          <div className="px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  data-nav="sair"
                  className="sidebar-item sx-v2-nav-row md:!h-[38px] md:!text-[12px]"
                >
                  <span className="sidebar-item-icon sx-v2-nav-icon">
                    <LogOut className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="sx-v2-nav-label">Sair</span>
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
