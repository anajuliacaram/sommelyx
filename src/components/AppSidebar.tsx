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

const personalMenu = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Minha Adega", url: "/dashboard/cellar", icon: GlassWater },
  { title: "Alertas", url: "/dashboard/alerts", icon: Bell },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
  { title: "Relatórios", url: "/dashboard/stats", icon: BarChart3 },
];

const commercialMenu = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Estoque", url: "/dashboard/inventory", icon: Package },
  { title: "Vendas", url: "/dashboard/sales", icon: ShoppingCart },
  { title: "Cadastros", url: "/dashboard/registers", icon: Users },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
];

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
      <Sidebar className="border-r" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <SidebarHeader className="pt-6">
          <div className="flex items-center gap-3.5 px-4 py-2 group cursor-default">
            <div className="relative">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-10 w-10 object-contain transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-black font-sans tracking-tight text-[#0F0F14]" style={{ letterSpacing: "-0.03em" }}>Sommelyx</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044]/60">
                {profileType === "commercial" ? "PREMIUM B2B" : "ACERVO PESSOAL"}
              </span>
            </div>
          </div>
          {/* CTA Adicionar Vinho */}
          <div className="px-3 pb-2">
            <Button
              variant="premium"
              onClick={() => setAddOpen(true)}
              className="w-full h-10 text-[12px] font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              {profileType === "commercial" ? "CADASTRAR VINHO" : "ADICIONAR VINHO"}
            </Button>
          </div>
        </SidebarHeader>

        <SidebarSeparator style={{ opacity: 0.5, borderColor: "rgba(0,0,0,0.06)" }} />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-medium" style={{ color: "#9CA3AF" }}>
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="transition-all duration-150 rounded-[12px] text-[13px]"
                        style={{ color: "#6B7280" }}
                        activeClassName="font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] font-medium" style={{ color: "#9CA3AF" }}>
              Conta
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/settings"
                      className="transition-all duration-150 rounded-[12px] text-[13px]"
                      style={{ color: "#6B7280" }}
                      activeClassName="font-medium"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configurações</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/plans"
                      className="transition-all duration-150 rounded-[12px] text-[13px]"
                      style={{ color: "#6B7280" }}
                      activeClassName="font-medium"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Meu Plano</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator style={{ opacity: 0.5, borderColor: "rgba(0,0,0,0.06)" }} />
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "#0F0F14" }}>{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-[10px] truncate font-mono" style={{ color: "#9CA3AF" }}>{user?.email}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="transition-all duration-150 rounded-[12px] text-[13px]"
                  style={{ color: "#6B7280" }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
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
