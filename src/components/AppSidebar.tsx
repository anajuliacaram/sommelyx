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
      <Sidebar collapsible="offcanvas" className="border-r border-border w-[240px]" style={{ background: "hsl(var(--sidebar-background))" }}>
        <SidebarHeader className="pt-4 md:pt-4 px-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-2.5 px-2 py-1.5 mb-3 rounded-lg transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15"
            aria-label="Ir para o início do dashboard"
          >
            <Logo
              variant="compact"
              className="h-[60px] w-auto"
            />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold tracking-[-0.02em] text-foreground leading-none">
                Sommelyx
              </span>
              <span
                className={[
                  "mt-1.5 w-fit inline-flex items-center rounded-md h-5 px-2",
                  "text-[9px] font-extrabold uppercase tracking-[0.1em] leading-none",
                  isCommercial
                    ? "bg-accent/12 text-accent ring-1 ring-accent/20"
                    : "bg-primary/10 text-primary ring-1 ring-primary/18",
                ].join(" ")}
              >
                {isCommercial ? "COMERCIAL" : "PESSOAL"}
              </span>
            </div>
          </Link>

          {/* CTAs */}
          <div className="px-0 pb-3">
            {isCommercial ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  className="col-span-2 h-9 text-[11px] font-medium rounded-lg"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-[11px] font-medium rounded-lg"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  Venda
                </Button>
                <Button
                  variant="danger"
                  className="h-9 text-[11px] font-medium rounded-lg"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Ruptura
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button
                  variant="primary"
                  className="h-9 text-[11px] font-medium rounded-lg"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar vinho
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-[11px] font-medium rounded-lg"
                  onClick={() => { setManageOpen(true); setManageTab("open"); closeMobileSidebar(); }}
                >
                  <Wine className="h-3.5 w-3.5 mr-1.5" />
                  Registrar consumo
                </Button>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="ghost"
                    className="h-8 text-[10px] font-medium rounded-lg border border-border/30 bg-background/30 hover:bg-primary/[0.03] hover:border-primary/10 hover:text-primary"
                    onClick={() => { setDishToWineOpen(true); closeMobileSidebar(); }}
                  >
                    <UtensilsCrossed className="h-3 w-3 mr-1" />
                    Harmonizar
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 text-[10px] font-medium rounded-lg border border-border/30 bg-background/30 hover:bg-primary/[0.03] hover:border-primary/10 hover:text-primary"
                    onClick={() => { setWineListScanOpen(true); closeMobileSidebar(); }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Analisar carta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-1.5 px-3">
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

          <SidebarGroup className="mt-2">
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-1.5 px-3">
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--wine-vivid)))" }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate text-foreground">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[11px] truncate text-muted-foreground/60">{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item !h-[36px] !text-[12px] hover:!bg-destructive/[0.04] hover:!text-destructive hover:!border-destructive/15"
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
