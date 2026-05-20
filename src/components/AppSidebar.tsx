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
  return (
    <>
      <Sidebar
        collapsible="offcanvas"
        className="w-[256px] border-r border-[var(--sx-b-default)] bg-[var(--sx-bg-card)]"
        style={{
          background: "var(--sx-bg-card)",
          borderColor: "var(--sx-b-default)",
          boxShadow: "none",
        }}
      >
        <SidebarHeader className="px-0 pt-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="mx-3 mt-0 flex items-center gap-3 rounded-[var(--sx-r-lg)] bg-[var(--sx-olive)] px-[18px] py-4 text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-olive-10)]"
            aria-label="Ir para o início do dashboard"
          >
            <img src="/logo-sommelyx-mark.png" className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)]" alt="Sommelyx" />

            <div className="flex min-w-0 flex-col text-left">
              <BrandName tone="light" className="text-[18px] font-medium leading-none tracking-[-0.01em]" />

              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65">
                {isCommercial ? "COMERCIAL" : "PESSOAL"}
              </span>
            </div>
          </Link>

          {/* CTAs */}
          <div className="mx-3 my-2">
            {isCommercial ? (
              <div className="sidebar-actions flex flex-col gap-0.5 rounded-[var(--sx-r-lg)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] p-2">
                <Button
                  variant="primary"
                  className="h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-md)] border-0 bg-[var(--sx-bordeaux)] px-4 py-3 text-[14px] font-medium text-[var(--sx-t-white)] shadow-none hover:bg-[var(--sx-bordeaux)] hover:opacity-90"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-[15px] w-[15px] shrink-0" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="ghost"
                  className="group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
                    <ShoppingCart className="h-[15px] w-[15px]" />
                  </span>
                  Registrar venda
                </Button>
                <Button
                  variant="ghost"
                  className="group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
                    <AlertTriangle className="h-[15px] w-[15px]" />
                  </span>
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

        <SidebarContent className="gap-0 px-0 pt-1">
          <SidebarGroup className="py-0">
            <SidebarGroupLabel className="mb-1.5 mt-4 px-5 text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--sx-t-muted)]">
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
                        data-nav={item.navKey}
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
            <SidebarGroupLabel className="mb-1.5 mt-4 px-5 text-[10px] font-semibold uppercase tracking-[0.10em] text-[var(--sx-t-muted)]">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/settings" className="sidebar-item" activeClassName="sidebar-item--active" data-nav="neutral" onClick={closeMobileSidebar}>
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/plans" className="sidebar-item" activeClassName="sidebar-item--active" data-nav="neutral" onClick={closeMobileSidebar}>
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
          <div className="px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  data-nav="sair"
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
