import { useNavigate } from "react-router-dom";
import { AnimatedOutlet } from "@/components/AnimatedOutlet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Bell, GlassWater, Wine, ArrowDownRight, Camera } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout() {
  const { user, profileType } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { drinkNow, lowStock } = useWineMetrics();
  const { data: wines } = useWines();
  const alertCount = drinkNow + lowStock;
  const isMobile = useIsMobile();

  const searchResults = useMemo(() => {
    if (!searchQuery || !wines) return [];
    const q = searchQuery.toLowerCase().trim();
    if (q.length < 1) return [];

    return wines
      .filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.producer?.toLowerCase().includes(q) ||
          w.grape?.toLowerCase().includes(q) ||
          w.country?.toLowerCase().includes(q) ||
          w.region?.toLowerCase().includes(q) ||
          w.style?.toLowerCase().includes(q) ||
          String(w.vintage ?? "").includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, wines]);

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const handleGoToWine = (wineName: string) => {
    const route = profileType === "commercial" ? "/dashboard/inventory" : "/dashboard/cellar";
    navigate(`${route}?q=${encodeURIComponent(wineName)}`);
    setSearchQuery("");
    setSearchFocused(false);
    setMobileSearchOpen(false);
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 md:h-[56px] flex items-center px-3 md:px-6 gap-2 md:gap-3 sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
            <SidebarTrigger className="shrink-0 h-12 w-12 md:h-10 md:w-10 rounded-2xl gradient-wine text-primary-foreground shadow-lg backdrop-blur-sm border border-white/20 transition-all active:scale-[0.95] hover:shadow-[0_6px_20px_hsl(var(--primary)/0.35)] [&>svg]:h-5 [&>svg]:w-5" />

            <div className="flex-1 max-w-lg relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Pesquise vinho, produtor, uva…"
                className="w-full h-9 pl-9 pr-3 rounded-2xl text-[12px] font-medium focus:outline-none transition-all bg-muted/40 border border-border/70 text-foreground"
              />

              {searchFocused && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50 bg-card/95 backdrop-blur-2xl border border-border shadow-xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((w) => (
                      <button
                        key={w.id}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                        onMouseDown={() => handleGoToWine(w.name)}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                          <Wine className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{w.name}</p>
                          <p className="text-xs text-muted-foreground">{[w.producer, w.vintage, w.region || w.country].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${w.quantity > 0 ? "text-success bg-success/10" : "text-muted-foreground bg-muted"}`}>
                          {w.quantity > 0 ? `${w.quantity} un.` : "Esgotado"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">Nenhum resultado para "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 sm:hidden" />

            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/40 text-muted-foreground"
                onClick={() => setMobileSearchOpen((v) => !v)}
              >
                <Search className="h-4 w-4" />
              </button>

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
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-muted/40 relative text-muted-foreground"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white bg-destructive">{alertCount}</span>}
              </button>

              {profileType !== "commercial" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gradient-wine text-primary-foreground btn-glow h-8 px-3 text-[11px] font-semibold border-0">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1">Adicionar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setAddOpen(true)} className="cursor-pointer">
                      <Wine className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-[12px]">Adicionar garrafa</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setManageTab("open"); setManageOpen(true); }} className="cursor-pointer">
                      <GlassWater className="h-4 w-4 mr-2 text-success" />
                      <span className="text-[12px]">Registrar abertura</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setManageTab("exit"); setManageOpen(true); }} className="cursor-pointer">
                      <ArrowDownRight className="h-4 w-4 mr-2 text-warning" />
                      <span className="text-[12px]">Registrar saída</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddOpen(true)} className="cursor-pointer">
                      <Camera className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-[12px]">Adicionar via foto</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div
                className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-pointer"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--wine-vivid)))" }}
                onClick={() => navigate("/dashboard/settings")}
              >
                {initials}
              </div>
            </div>
          </header>

          {mobileSearchOpen && (
            <div className="sm:hidden px-3 py-2 sticky top-12 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl text-[12px] font-medium focus:outline-none bg-muted/40 border border-border/70 text-foreground"
                />
              </div>
              {searchQuery && (
                <div className="mt-2 rounded-xl border border-border bg-card/95 overflow-hidden">
                  {searchResults.length > 0 ? (
                    searchResults.map((w) => (
                      <button key={w.id} onClick={() => handleGoToWine(w.name)} className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted/40">
                        <p className="font-semibold text-foreground truncate">{w.name}</p>
                        <p className="text-muted-foreground truncate">{[w.producer, w.vintage, w.region || w.country].filter(Boolean).join(" · ")}</p>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum resultado</p>
                  )}
                </div>
              )}
            </div>
          )}

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
