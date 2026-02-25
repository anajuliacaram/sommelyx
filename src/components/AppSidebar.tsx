import { LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
  { title: "Analytics", url: "/dashboard/stats", icon: BarChart3 },
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
  const menu = profileType === "commercial" ? commercialMenu : personalMenu;

  return (
    <Sidebar className="border-r" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-9 w-9 object-contain" />
          <div className="flex flex-col">
            <span className="text-[14px] font-bold font-sans tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.02em" }}>Sommelyx</span>
            <span className="text-[10px] capitalize font-medium" style={{ color: "#9CA3AF" }}>
              {profileType === "commercial" ? "Comercial" : "Pessoal"}
            </span>
          </div>
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
          <p className="text-[11px] truncate mb-2 px-2 font-mono" style={{ color: "#9CA3AF" }}>{user?.email}</p>
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
  );
}
