import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";

export default function DashboardLayout() {
  const { user, profileType, loading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F7F8" }}>
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
      <div className="min-h-screen flex w-full" style={{ background: "#F7F7F8" }}>
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header
            className="h-[56px] flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30"
            style={{
              background: "rgba(247,247,248,0.75)",
              backdropFilter: "blur(16px) saturate(1.5)",
              borderBottom: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <SidebarTrigger className="transition-colors" style={{ color: "#9CA3AF" }} />
            
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  placeholder="Buscar vinhos, produtores..."
                  className="w-full h-9 pl-9 pr-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#8F2D56]/20 transition-all"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "#0F0F14",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all duration-200 hover:bg-black/[0.04]"
                style={{ color: "#9CA3AF" }}
              >
                <Bell className="h-4 w-4" />
              </button>

              {/* Add button */}
              <Button
                size="sm"
                className="gradient-wine text-white btn-glow h-9 px-4 text-[12px] font-semibold border-0"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">{profileType === "commercial" ? "Cadastrar" : "Adicionar"}</span>
              </Button>

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}
              >
                {initials}
              </div>
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
