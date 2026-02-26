import { LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Bell, Settings, Plus, Wine } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

const personalMenu: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Adega", url: "/dashboard/cellar", icon: GlassWater, badge: "Cellar", badgeType: "novo" },
  { title: "Alertas", url: "/dashboard/alerts", icon: Bell },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
  { title: "Relatórios", url: "/dashboard/stats", icon: BarChart3, badge: "Pro", badgeType: "pro" },
];

const commercialMenu: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package, badge: "Beta", badgeType: "beta" },
  { title: "Vendas", url: "/dashboard/sales", icon: ShoppingCart },
  { title: "Cadastros", url: "/dashboard/registers", icon: Users, badge: "Novo", badgeType: "novo" },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText, badge: "Pro", badgeType: "pro" },
];

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
  badgeType?: "novo" | "beta" | "pro";
}

export function AppSidebar() {
  const { profileType, signOut, user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const menu = profileType === "commercial" ? commercialMenu : personalMenu;
  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <>
      <Sidebar className="border-r" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FDFDFD" }}>
        <SidebarHeader className="pt-8 px-4">
          <div className="flex items-center gap-3.5 px-2 py-2 group cursor-default mb-6">
            <div className="relative">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-10 w-10 object-contain transition-transform group-hover:scale-110 active:scale-95 duration-500" />
              <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-black font-sans tracking-tight text-[#0F0F14]" style={{ letterSpacing: "-0.04em" }}>Sommelyx</span>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#8C2044]/50 leading-none mt-0.5">
                {profileType === "commercial" ? "PREMIUM B2B" : "ACERVO PESSOAL"}
              </span>
            </div>
          </div>

          {/* CTA Adicionar Vinho Premium */}
          <div className="px-0 pb-4">
            <Button
              variant="premium"
              onClick={() => setAddOpen(true)}
              className="w-full h-12 text-[13px] font-black uppercase tracking-wider rounded-[18px] shadow-float border border-white/20 active:scale-95 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-4 w-4 mr-2 relative z-10" />
              <span className="relative z-10">{profileType === "commercial" ? "CADASTRAR VINHO" : "ADICIONAR VINHO"}</span>
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-[#9CA3AF]/60 mb-3 px-4">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {menu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="sidebar-item"
                        activeClassName="sidebar-item--active"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <span className={`sidebar-badge sidebar-badge--${item.badgeType}`}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-[#9CA3AF]/60 mb-3 px-4">
              Configurações
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink
                      to="/dashboard/settings"
                      className="sidebar-item"
                      activeClassName="sidebar-item--active"
                    >
                      <Settings className="h-[18px] w-[18px] shrink-0" />
                      <span>Preferências</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink
                      to="/dashboard/plans"
                      className="sidebar-item"
                      activeClassName="sidebar-item--active"
                    >
                      <CreditCard className="h-[18px] w-[18px] shrink-0" />
                      <span>Meu Plano</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-3 py-6">
            <div className="flex items-center gap-3 px-3 mb-6 group cursor-default">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-[13px] font-black text-white flex-shrink-0 shadow-premium transition-transform group-hover:scale-105 duration-500"
                  style={{ background: "linear-gradient(135deg, #8C2044, #C44569)" }}
                >
                  {initials}
                </div>
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[14px] font-bold truncate text-[#0F0F14]" style={{ letterSpacing: "-0.02em" }}>{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[10px] truncate font-mono text-[#9CA3AF]" style={{ letterSpacing: "0.05em" }}>{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="sidebar-item hover:bg-red-50/50 hover:text-red-600 hover:border-red-200/50 transition-all duration-300"
                >
                  <LogOut className="h-[18px] w-[18px] shrink-0" />
                  <span className="font-bold">Sair do Sistema</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>
      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
