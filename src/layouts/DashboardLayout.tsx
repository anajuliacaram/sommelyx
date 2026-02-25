import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";

export default function DashboardLayout() {
  const { user, profileType, loading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-48">
          <div className="skeleton-premium h-6 w-full rounded-lg" />
          <div className="skeleton-premium h-4 w-3/4 rounded-lg" />
          <div className="skeleton-premium h-4 w-1/2 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profileType) return <Navigate to="/select-profile" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border/35 flex items-center px-4 md:px-6 gap-4 bg-secondary/50 backdrop-blur-xl sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar vinhos..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gradient-wine text-primary-foreground btn-glow h-9 px-4 text-[12px] font-medium rounded-lg"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">{profileType === "commercial" ? "Cadastrar" : "Adicionar"}</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-5 md:p-7 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
    </SidebarProvider>
  );
}
