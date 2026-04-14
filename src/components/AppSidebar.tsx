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
import { Logo } from "@/components/Logo";
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
        className="w-[240px]"
        style={{
          background: "linear-gradient(180deg, rgba(7, 16, 12, 0.72) 0%, rgba(7, 16, 12, 0.78) 100%)",
          backdropFilter: "blur(24px) saturate(1.08)",
          WebkitBackdropFilter: "blur(24px) saturate(1.08)",
          borderColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
        <SidebarHeader className="pt-2 md:pt-2 px-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex w-full items-center gap-2.5 px-3 py-3 mb-2 rounded-2xl transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15 overflow-hidden"
            aria-label="Ir para o início do dashboard"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div className="flex h-[66px] w-[42px] shrink-0 items-center justify-center">
              <img
                src="/logo-sommelyx-mark.png"
                alt="Sommelyx"
                draggable={false}
                className="h-[66px] w-auto max-w-none select-none object-contain drop-shadow-[0_6px_12px_rgba(15,15,20,0.18)] border-none opacity-95"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start justify-center py-0.5">
              <span className="block text-[24px] font-bold tracking-[-0.01em] leading-[0.95] font-serif whitespace-nowrap" style={{ color: "#F5F5F3" }}>
                Sommelyx
              </span>
              <span
                className={[
                  "chip-surface mt-[5px] h-5 px-2.5",
                  isCommercial
                    ? "chip-surface--active text-[#1E1811]"
                    : "bg-[rgba(110,30,42,0.20)] text-[#FAF7F2] border-[rgba(110,30,42,0.28)]",
                ].join(" ")}
              >
                {isCommercial ? "COMERCIAL" : "PESSOAL"}
              </span>
            </div>
          </Link>

          {/* CTAs */}
          <div className="px-0 pb-1">
            {isCommercial ? (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full h-11 text-[14px] font-semibold rounded-2xl gap-1.5 px-4 shadow-[0_8px_20px_-12px_hsl(var(--wine)/0.35)] hover:shadow-[0_12px_24px_-12px_hsl(var(--wine)/0.4)]"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-[15px] w-[15px] shrink-0" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-2xl border border-white/10 bg-[rgba(248,245,240,0.16)] text-[14px] font-semibold text-[rgba(245,245,243,0.92)] gap-1.5 px-4 backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(248,245,240,0.22)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] active:translate-y-[0.5px] [&_svg]:text-[hsl(var(--copper-light))]"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-[15px] w-[15px] shrink-0" />
                  Registrar venda
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-10 rounded-2xl border border-white/10 bg-[rgba(248,245,240,0.16)] text-[13.5px] font-semibold text-[rgba(245,245,243,0.92)] gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(248,245,240,0.22)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)] active:translate-y-[0.5px] [&_svg]:text-destructive"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <AlertTriangle className="h-[15px] w-[15px] shrink-0" />
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
          <SidebarGroup>
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold mb-1 px-3" style={{ color: "rgba(245, 245, 243, 0.35)" }}>
              {isCommercial ? "Operação" : "Navegação"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
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

          <SidebarGroup className="mt-1">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold mb-1 px-3" style={{ color: "rgba(245, 245, 243, 0.35)" }}>
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
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
          <div className="px-3 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--copper)), hsl(var(--copper-light)))",
                  color: "#1A2418",
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "#F5F5F3" }}>{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[11px] truncate" style={{ color: "rgba(245, 245, 243, 0.45)" }}>{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item !h-[36px] !text-[12px] hover:!bg-red-500/10 hover:!text-red-400 hover:!border-red-500/15"
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
