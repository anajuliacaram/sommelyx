import { LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, Wine, Camera, PenLine, AlertTriangle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Adega", url: "/dashboard/cellar", icon: GlassWater },
  { title: "Alertas", url: "/dashboard/alerts", icon: Bell },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
  { title: "Relatórios", url: "/dashboard/stats", icon: BarChart3 },
];

const commercialMenu: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Vendas", url: "/dashboard/sales", icon: ShoppingCart },
  { title: "Cadastros", url: "/dashboard/registers", icon: Users },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
];

export function AppSidebar() {
  const { profileType, signOut, user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [addOpen, setAddOpen] = useState(false);
  const [addWithScan, setAddWithScan] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
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
        <SidebarHeader className="pt-5 px-3">
          {/* Logo + Mode */}
          <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-8 w-8 object-contain" />
            <div className="flex flex-col">
              <span className="text-[14px] font-black font-sans tracking-tight text-foreground" style={{ letterSpacing: "-0.04em" }}>Sommelyx</span>
              <span
                className="text-[8px] font-black uppercase tracking-[0.2em] leading-none mt-0.5"
                style={{ color: isCommercial ? "hsl(var(--gold))" : "hsl(var(--primary))", opacity: 0.7 }}
              >
                {isCommercial ? "OPERAÇÃO COMERCIAL" : "ACERVO PESSOAL"}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="px-0 pb-2 flex flex-col gap-1.5">
            {isCommercial ? (
              <>
                <Button
                  variant="premium"
                  className="w-full h-9 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-float border border-white/20 active:scale-[0.97] transition-all"
                  onClick={() => { setAddOpen(true); setAddWithScan(false); closeMobileSidebar(); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar Estoque
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-9 text-[11px] font-bold uppercase tracking-wider rounded-xl active:scale-[0.97] transition-all"
                  onClick={() => { setManageTab("exit"); setManageOpen(true); closeMobileSidebar(); }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar Venda
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-9 text-[11px] font-bold uppercase tracking-wider rounded-xl active:scale-[0.97] transition-all text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                  onClick={() => { setManageTab("exit"); setManageOpen(true); closeMobileSidebar(); }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar Ruptura
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="premium"
                    className="w-full h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-float border border-white/20 active:scale-[0.97] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar vinho na adega
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl">
                  <DropdownMenuItem onClick={() => { setAddWithScan(false); setAddOpen(true); }} className="py-2.5 px-3 cursor-pointer">
                    <PenLine className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    <span className="font-medium text-[12px]">Cadastro Manual</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setAddWithScan(true); setAddOpen(true); }} className="py-2.5 px-3 cursor-pointer">
                    <Camera className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    <span className="font-medium text-[12px]">Escanear Rótulo</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                        className="sidebar-item !h-[42px] !text-[13px]"
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
                    <NavLink to="/dashboard/settings" className="sidebar-item !h-[42px] !text-[13px]" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
                      <Settings className="h-4 w-4 shrink-0" />
                      <span>Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to="/dashboard/plans" className="sidebar-item !h-[42px] !text-[13px]" activeClassName="sidebar-item--active" onClick={closeMobileSidebar}>
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
          <div className="px-3 py-4">
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
    </>
  );
}
