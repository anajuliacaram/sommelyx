import { Wine, LayoutDashboard, GlassWater, Heart, BarChart3, CreditCard, Package, ShoppingCart, Users, FileText, LogOut, Settings } from "lucide-react";
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
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-9 w-9 object-contain" />
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-sidebar-foreground font-sans tracking-tight" style={{ letterSpacing: "-0.02em" }}>Sommelyx</span>
            <span className="text-[10px] text-sidebar-foreground/50 capitalize font-medium">
              {profileType === "commercial" ? "Comercial" : "Pessoal"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-25" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.1em] font-medium">
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
                      className="text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all duration-150 rounded-lg text-[13px]"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-[0.1em] font-medium">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/dashboard/plans"
                    className="text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all duration-150 rounded-lg text-[13px]"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
        <SidebarSeparator className="opacity-25" />
        <div className="px-3 py-3">
          <p className="text-[11px] text-sidebar-foreground/45 truncate mb-2 px-2 font-mono">{user?.email}</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={signOut}
                className="text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all duration-150 rounded-lg text-[13px]"
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
