import { useNavigate } from "react-router-dom";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { user, profileType } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = drinkNow + lowStock;
  const isMobile = useIsMobile();

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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full" style={{ background: "#F7F7F8" }}>
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header
            className="h-12 md:h-[56px] flex items-center px-3 md:px-6 gap-2 md:gap-3 sticky top-0 z-30"
            style={{
              background: "rgba(247,247,248,0.82)",
              backdropFilter: "blur(16px) saturate(1.5)",
              borderBottom: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <SidebarTrigger className="transition-colors shrink-0" style={{ color: "#9CA3AF" }} />
            
            {/* Search — hidden on very small screens, icon-only trigger could be added */}
            <div className="flex-1 max-w-lg relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Pesquise vinho, produtor, uva…"
                className="w-full h-9 pl-9 pr-3 rounded-2xl text-[12px] font-medium focus:outline-none transition-all"
                style={{
                  background: searchFocused ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.025)",
                  border: `1px solid ${searchFocused ? "rgba(143,45,86,0.15)" : "rgba(0,0,0,0.05)"}`,
                  color: "#0F0F14",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(143,45,86,0.08)" : "none",
                }}
              />
              {searchFocused && searchQuery && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 24px 50px -30px rgba(15,15,20,0.45), 0 4px 12px rgba(15,15,20,0.08)",
                  }}
                >
                  {searchResults.map(w => (
                    <button
                      key={w.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                      onMouseDown={() => { navigate("/dashboard/cellar"); setSearchQuery(""); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate text-foreground">{w.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {[w.producer, w.vintage, w.country].filter(Boolean).join(" · ")} · {w.quantity} un.
                        </p>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a" }}>
                        Em estoque
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchFocused && searchQuery && searchResults.length === 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl p-3 text-center z-50"
                  style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
                >
                  <p className="text-[11px] text-muted-foreground">Nenhum resultado para "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Mobile search icon */}
            <div className="flex-1 sm:hidden" />

            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Mobile search toggle */}
              <button
                className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/[0.04]"
                style={{ color: "#9CA3AF" }}
                onClick={() => {
                  const el = document.getElementById('mobile-search');
                  if (el) el.classList.toggle('hidden');
                }}
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Mode indicator — always visible */}
              <span
                className="inline-flex items-center h-6 px-2.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em] shrink-0"
                style={{
                  background: profileType === "commercial" ? "hsl(var(--gold) / 0.1)" : "hsl(var(--primary) / 0.06)",
                  color: profileType === "commercial" ? "hsl(var(--gold))" : "hsl(var(--primary))",
                  border: `1px solid ${profileType === "commercial" ? "hsl(var(--gold) / 0.2)" : "hsl(var(--primary) / 0.12)"}`,
                }}
              >
                {profileType === "commercial" ? "Comercial" : "Pessoal"}
              </span>

              <button
                onClick={() => navigate("/dashboard/alerts")}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-black/[0.04] relative"
                style={{ color: "#9CA3AF" }}
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: "#E07A5F" }}>
                    {alertCount}
                  </span>
                )}
              </button>

              {/* Add wine dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="gradient-wine text-white btn-glow h-8 px-3 text-[11px] font-semibold border-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1">{profileType === "commercial" ? "Cadastrar" : "Adicionar"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setAddOpen(true)} className="cursor-pointer">
                    <Wine className="h-4 w-4 mr-2" style={{ color: "#8F2D56" }} />
                    <span className="text-[12px]">Adicionar garrafa</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setManageTab("open"); setManageOpen(true); }} className="cursor-pointer">
                    <GlassWater className="h-4 w-4 mr-2" style={{ color: "#22c55e" }} />
                    <span className="text-[12px]">Registrar abertura</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setManageTab("exit"); setManageOpen(true); }} className="cursor-pointer">
                    <ArrowDownRight className="h-4 w-4 mr-2" style={{ color: "#E07A5F" }} />
                    <span className="text-[12px]">Registrar saída</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAddOpen(true)} className="cursor-pointer">
                    <Camera className="h-4 w-4 mr-2" style={{ color: "#8F2D56" }} />
                    <span className="text-[12px]">Adicionar via foto</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div
                className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)" }}
                onClick={() => navigate("/dashboard/settings")}
              >
                {initials}
              </div>
            </div>
          </header>

          {/* Mobile search bar — togglable */}
          <div id="mobile-search" className="hidden sm:hidden px-3 py-2 sticky top-12 z-20" style={{ background: "rgba(247,247,248,0.95)", backdropFilter: "blur(12px)" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full h-9 pl-9 pr-3 rounded-xl text-[12px] font-medium focus:outline-none"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", color: "#0F0F14" }}
              />
            </div>
          </div>

          <div className="flex-1 p-3 md:p-5 lg:p-8">
            <AnimatedOutlet />
          </div>
        </main>
      </div>
      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
    </SidebarProvider>
  );
}
