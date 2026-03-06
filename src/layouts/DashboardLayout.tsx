import { Navigate, useNavigate } from "react-router-dom";
import { AnimatedOutlet } from "@/components/AnimatedOutlet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Bell, GlassWater, Wine, ArrowDownRight, Camera, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { useWineMetrics, useWines } from "@/hooks/useWines";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DashboardLayout() {
  const { user, profileType, loading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = drinkNow + lowStock;

  const searchResults = useMemo(() => {
    if (!searchQuery || !wines) return [];
    const q = searchQuery.toLowerCase();
    return wines
      .filter(w => w.quantity > 0 && (
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) ||
        String(w.vintage).includes(q)
      ))
      .slice(0, 6);
  }, [searchQuery, wines]);

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F7F8" }}>
        <div className="space-y-3 w-48 animate-pulse">
          <div className="h-6 w-full rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }} />
          <div className="h-4 w-3/4 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
          <div className="h-4 w-1/2 rounded-lg" style={{ background: "rgba(0,0,0,0.03)" }} />
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
        <main className="flex-1 flex flex-col min-w-0">
          <header
            className="h-[56px] flex items-center px-4 md:px-6 gap-3 sticky top-0 z-30"
            style={{
              background: "rgba(247,247,248,0.82)",
              backdropFilter: "blur(16px) saturate(1.5)",
              borderBottom: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <SidebarTrigger className="transition-colors" style={{ color: "#9CA3AF" }} />
            
            {/* Search */}
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Pesquise vinho, produtor, uva, safra…"
                className="w-full h-9 pl-9 pr-3 rounded-[12px] text-sm focus:outline-none transition-all"
                style={{
                  background: searchFocused ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.025)",
                  border: `1px solid ${searchFocused ? "rgba(143,45,86,0.15)" : "rgba(0,0,0,0.05)"}`,
                  color: "#0F0F14",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(143,45,86,0.08)" : "none",
                }}
              />
              {/* Search dropdown */}
              {searchFocused && searchQuery && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-[14px] overflow-hidden z-50"
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                  }}
                >
                  {searchResults.map(w => (
                    <button
                      key={w.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                      onMouseDown={() => { navigate("/dashboard/cellar"); setSearchQuery(""); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: "#0F0F14" }}>{w.name}</p>
                        <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
                          {[w.producer, w.vintage, w.country].filter(Boolean).join(" · ")} · {w.quantity} un.
                          {w.cellar_location ? ` · ${w.cellar_location}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e" }}>
                        Em estoque
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchFocused && searchQuery && searchResults.length === 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-[14px] p-4 text-center z-50"
                  style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
                >
                  <p className="text-[12px]" style={{ color: "#9CA3AF" }}>Nenhum resultado para "{searchQuery}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Profile badge */}
              <span
                className="hidden sm:inline-flex items-center h-7 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: profileType === "commercial" ? "rgba(201,168,106,0.1)" : "rgba(143,45,86,0.06)",
                  color: profileType === "commercial" ? "#C9A86A" : "#8F2D56",
                  border: `1px solid ${profileType === "commercial" ? "rgba(201,168,106,0.2)" : "rgba(143,45,86,0.12)"}`,
                }}
              >
                {profileType === "commercial" ? "Comercial" : "Pessoal"}
              </span>

              <button
                onClick={() => navigate("/dashboard/alerts")}
                className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all duration-200 hover:bg-black/[0.04] relative"
                style={{ color: "#9CA3AF" }}
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "#E07A5F" }}>
                    {alertCount}
                  </span>
                )}
              </button>

              {/* Add wine dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="gradient-wine text-white btn-glow h-9 px-4 text-[12px] font-semibold border-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">{profileType === "commercial" ? "Cadastrar" : "Adicionar"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setAddOpen(true)} className="cursor-pointer">
                    <Wine className="h-4 w-4 mr-2" style={{ color: "#8F2D56" }} />
                    <span className="text-[13px]">Adicionar garrafa</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setManageTab("open"); setManageOpen(true); }} className="cursor-pointer">
                    <GlassWater className="h-4 w-4 mr-2" style={{ color: "#22c55e" }} />
                    <span className="text-[13px]">Registrar abertura</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setManageTab("exit"); setManageOpen(true); }} className="cursor-pointer">
                    <ArrowDownRight className="h-4 w-4 mr-2" style={{ color: "#E07A5F" }} />
                    <span className="text-[13px]">Registrar saída</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <Camera className="h-4 w-4 mr-2" />
                        <span className="text-[13px]">Adicionar via foto</span>
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(143,45,86,0.08)", color: "#8F2D56" }}>Em breve</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p className="text-xs">Reconhecimento de rótulo por foto será lançado em breve.</p></TooltipContent>
                  </Tooltip>
                </DropdownMenuContent>
              </DropdownMenu>

              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 cursor-pointer transition-all duration-200 hover:scale-105"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}
                onClick={() => navigate("/dashboard/settings")}
              >
                {initials}
              </div>
            </div>
          </header>
          <div className="flex-1 p-5 md:p-7 lg:p-8">
            <AnimatedOutlet />
          </div>
        </main>
      </div>
      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
    </SidebarProvider>
  );
}
