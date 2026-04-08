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
        <SidebarHeader className="pt-2.5 md:pt-2.5 px-3">
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 px-1 py-1.5 mb-1.5 rounded-lg transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15"
            aria-label="Ir para o início do dashboard"
          >
            <div className="relative flex h-[88px] w-[66px] shrink-0 items-center justify-center overflow-hidden rounded-xl">
              <Logo
                variant="compact"
                className="h-[170px] w-auto scale-[1.16] object-contain drop-shadow-[0_10px_18px_rgba(15,15,20,0.22)]"
              />
            </div>
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
          <div className="px-0 pb-2.5">
            {isCommercial ? (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="primary"
                  className="col-span-2 h-10 justify-start rounded-2xl px-3 text-[10.5px] font-semibold"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Cadastrar produto
                </Button>
                <Button
                  variant="outline"
                  className="h-9 justify-start rounded-2xl px-3 text-[10.5px] font-semibold"
                  onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                  Venda
                </Button>
                <Button
                  variant="danger"
                  className="h-9 justify-start rounded-2xl px-3 text-[10.5px] font-semibold"
                  onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Ruptura
                </Button>
              </div>
            ) : (
            <section className="rounded-3xl border border-primary/10 bg-background/86 p-3 shadow-[0_10px_26px_-22px_rgba(25,18,22,0.40)] backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                  AÇÕES RÁPIDAS
                </p>
                <span className="h-1.5 w-1.5 rounded-full bg-primary/25" aria-hidden="true" />
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  variant="primary"
                  className="h-14 w-full justify-start gap-2.5 rounded-2xl px-4 text-[13px] font-semibold tracking-[-0.01em] shadow-[0_14px_28px_-18px_hsl(var(--wine)/0.48)] hover:shadow-[0_18px_30px_-18px_hsl(var(--wine)/0.55)]"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Adicionar vinho
                </Button>

                <Button
                  variant="secondary"
                  className="h-14 w-full justify-start gap-2.5 rounded-2xl border-primary/15 bg-primary/[0.04] px-4 text-[13px] font-semibold text-primary hover:bg-primary/[0.08] hover:border-primary/25"
                  onClick={() => { setManageOpen(true); setManageTab("open"); closeMobileSidebar(); }}
                >
                  <Wine className="h-4 w-4 shrink-0" />
                  Registrar consumo
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    className="h-12 w-full justify-start gap-2.5 rounded-2xl border border-border/45 bg-background/82 px-3.5 text-[10.5px] font-semibold tracking-[-0.01em] shadow-[0_8px_18px_-18px_rgba(20,15,18,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/[0.06] hover:border-accent/25 hover:text-accent hover:shadow-[0_12px_20px_-16px_rgba(20,15,18,0.42)]"
                    onClick={() => { setDishToWineOpen(true); closeMobileSidebar(); }}
                  >
                    <UtensilsCrossed className="h-4 w-4 shrink-0" />
                    Harmonizar
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-12 w-full justify-start gap-2.5 rounded-2xl border border-border/45 bg-background/82 px-3.5 text-[10.5px] font-semibold tracking-[-0.01em] shadow-[0_8px_18px_-18px_rgba(20,15,18,0.38)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/[0.06] hover:border-accent/25 hover:text-accent hover:shadow-[0_12px_20px_-16px_rgba(20,15,18,0.42)]"
                    onClick={() => { setWineListScanOpen(true); closeMobileSidebar(); }}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    Analisar carta
                  </Button>
                </div>
              </div>
            </section>
          )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 pt-1.5">
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

          <SidebarGroup className="mt-1.5">
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
          <div className="px-3 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-2 mb-2.5">
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
