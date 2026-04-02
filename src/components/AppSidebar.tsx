import { LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, Wine, Camera, PenLine, AlertTriangle, ClipboardList } from "@/icons/lucide";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { BreakageDialog } from "@/components/BreakageDialog";
import { SaleDialog } from "@/components/SaleDialog";
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
      <Sidebar collapsible="offcanvas" className="border-r" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FDFDFD" }}>
        <SidebarHeader className="pt-3 md:pt-4 px-3">
          {/* Logo + Mode */}
          <Link
            to="/dashboard"
            onClick={closeMobileSidebar}
            className="flex items-center gap-3 px-2 py-1.5 mb-3 rounded-2xl transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            aria-label="Ir para o início do dashboard"
          >
            <Logo
              variant="compact"
              className="h-14 sm:h-14 w-auto drop-shadow-[0_14px_30px_rgba(15,15,20,0.16)]"
            />
            <div className="flex flex-col">
              <span
                className="text-[18px] font-black font-serif tracking-tight text-[#7B1E3A] leading-none"
                style={{ letterSpacing: "-0.04em" }}
              >
                Sommelyx
              </span>
              <span
                className={[
                  "mt-1 w-fit inline-flex items-center rounded-full px-3 py-1",
                  "text-[10px] font-black uppercase tracking-[0.18em] leading-none",
                  isCommercial
                    ? "bg-[#C6A768]/15 text-[#8A6A2A] ring-1 ring-[#C6A768]/35"
                    : "bg-[#6E1E2A]/8 text-[#6E1E2A] ring-1 ring-[#6E1E2A]/18",
                ].join(" ")}
              >
                {isCommercial ? "COMERCIAL" : "PESSOAL"}
              </span>
            </div>
          </Link>

          {/* CTA */}
          <div className="px-0 pb-2">
            {isCommercial ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    className="col-span-2 h-10 text-[11px] font-black uppercase tracking-wider rounded-2xl"
                    onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Cadastrar produto
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-[11px] font-black uppercase tracking-wider rounded-2xl"
                    onClick={() => { setSaleOpen(true); closeMobileSidebar(); }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    Venda
                  </Button>
                  <Button
                    variant="danger"
                    className="h-10 text-[11px] font-black uppercase tracking-wider rounded-2xl"
                    onClick={() => { setBreakageOpen(true); closeMobileSidebar(); }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    Ruptura
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Button
                    variant="primary"
                    className="h-10 text-[11px] font-black uppercase tracking-wider rounded-2xl"
                    onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar vinho
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-[11px] font-black uppercase tracking-wider rounded-2xl"
                    onClick={() => { setManageOpen(true); setManageTab("open"); closeMobileSidebar(); }}
                  >
                    <Wine className="h-4 w-4 mr-1.5" />
                    Registrar consumo
                  </Button>
                </div>
              </>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/50 mb-1.5 px-3">
              {isCommercial ? "Operação" : "Navegação"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {menu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="sidebar-item !text-[13px]"
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
            <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/50 mb-1.5 px-3">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/settings" className="sidebar-item !text-[13px]" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/plans" className="sidebar-item !text-[13px]" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
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
          <div className="px-3 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 px-2 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--wine-vivid)))" }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate text-foreground">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[9px] truncate text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item !h-[38px] !text-[12px] hover:!bg-destructive/5 hover:!text-destructive hover:!border-destructive/20"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <AddWineDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setAddWithScan(false);
        }}
        initialScan={addWithScan}
      />
      <ManageBottleDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        defaultTab={manageTab}
      />
      <BreakageDialog
        open={breakageOpen}
        onOpenChange={setBreakageOpen}
      />
      <SaleDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
      />
    </>
  );
}
