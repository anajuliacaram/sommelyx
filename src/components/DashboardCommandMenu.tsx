import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CircleDollarSign,
  Compass,
  FileText,
  GlassWater,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Upload,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { Wine as WineRecord } from "@/hooks/useWines";

type ActionDefinition = {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  onSelect: () => void;
};

interface DashboardCommandMenuProps {
  profileType: "personal" | "commercial" | null;
  wines: WineRecord[];
  alertCount: number;
  onAddWine: () => void;
  onImportCsv?: () => void;
  onRegisterOpen: () => void;
  onRegisterExit?: () => void;
  onRegisterSale?: () => void;
}

export function DashboardCommandMenu({
  profileType,
  wines,
  alertCount,
  onAddWine,
  onImportCsv,
  onRegisterOpen,
  onRegisterExit,
  onRegisterSale,
}: DashboardCommandMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isCommercial = profileType === "commercial";
  const commandLabel = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac") ? "Cmd + K" : "Ctrl + K";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navItems = useMemo<ActionDefinition[]>(
    () =>
      isCommercial
        ? [
            { label: "Visao geral", shortcut: "G D", icon: LayoutDashboard, onSelect: () => navigate("/dashboard") },
            { label: "Estoque", shortcut: "G E", icon: Package, onSelect: () => navigate("/dashboard/inventory") },
            { label: "Vendas", shortcut: "G V", icon: ShoppingCart, onSelect: () => navigate("/dashboard/sales") },
            { label: "Relatorios", shortcut: "G R", icon: FileText, onSelect: () => navigate("/dashboard/reports") },
            { label: `Alertas${alertCount > 0 ? ` (${alertCount})` : ""}`, shortcut: "G A", icon: Bell, onSelect: () => navigate("/dashboard/alerts") },
          ]
        : [
            { label: "Visao geral", shortcut: "G D", icon: LayoutDashboard, onSelect: () => navigate("/dashboard") },
            { label: "Minha adega", shortcut: "G C", icon: GlassWater, onSelect: () => navigate("/dashboard/cellar") },
            { label: "Meu consumo", shortcut: "G M", icon: Wine, onSelect: () => navigate("/dashboard/consumption") },
            { label: "Wishlist", shortcut: "G W", icon: Compass, onSelect: () => navigate("/dashboard/wishlist") },
            { label: `Alertas${alertCount > 0 ? ` (${alertCount})` : ""}`, shortcut: "G A", icon: Bell, onSelect: () => navigate("/dashboard/alerts") },
          ],
    [alertCount, isCommercial, navigate],
  );

  const actionItems = useMemo<ActionDefinition[]>(
    () =>
      [
        { label: isCommercial ? "Cadastrar produto" : "Adicionar vinho", shortcut: "A", icon: Plus, onSelect: onAddWine },
        onImportCsv
          ? { label: "Importar planilha", shortcut: "I", icon: Upload, onSelect: onImportCsv }
          : undefined,
        {
          label: isCommercial ? "Registrar movimentacao" : "Registrar abertura",
          shortcut: "O",
          icon: Sparkles,
          onSelect: onRegisterOpen,
        },
        isCommercial && onRegisterSale
          ? {
              label: "Registrar venda",
              shortcut: "S",
              icon: CircleDollarSign,
              onSelect: onRegisterSale,
            }
          : undefined,
        !isCommercial && onRegisterExit
          ? {
              label: "Registrar saida",
              shortcut: "X",
              icon: Wine,
              onSelect: onRegisterExit,
            }
          : undefined,
      ].filter(Boolean) as ActionDefinition[],
    [isCommercial, onAddWine, onImportCsv, onRegisterExit, onRegisterOpen, onRegisterSale],
  );

  const wineResults = useMemo(
    () =>
      wines
        .filter((wine) => wine.quantity > 0)
        .slice()
        .sort((a, b) => {
          const aScore = (a.drink_until ?? 9999) - (a.drink_from ?? 0);
          const bScore = (b.drink_until ?? 9999) - (b.drink_from ?? 0);
          return aScore - bScore;
        })
        .slice(0, 8),
    [wines],
  );

  const handleNavigateToWine = (wineName: string) => {
    const route = isCommercial ? "/dashboard/inventory" : "/dashboard/cellar";
    navigate(`${route}?q=${encodeURIComponent(wineName)}`);
    setOpen(false);
  };

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden h-9 min-w-[180px] items-center justify-between rounded-2xl border-white/20 bg-white/70 px-3 text-[12px] font-semibold text-[#5F5663] shadow-[0_12px_28px_-22px_rgba(23,20,29,0.55)] md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="h-4 w-4 text-[#8C2044]" />
          Command menu
        </span>
        <span className="rounded-lg border border-black/[0.08] bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8A808E]">
          {commandLabel}
        </span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-xl border-white/20 bg-white/70 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu rápido"
      >
        <Search className="h-4 w-4 text-[#8C2044]" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={
            isCommercial
              ? "Buscar telas, ações e produtos..."
              : "Buscar telas, ações e rótulos..."
          }
          className="h-14 text-[15px]"
        />
        <CommandList className="max-h-[440px]">
          <CommandEmpty>Nada encontrado. Tente outro termo.</CommandEmpty>

          <CommandGroup heading="Navegacao">
            {navItems.map((item) => (
              <CommandItem
                key={item.label}
                className="rounded-2xl px-3 py-3"
                onSelect={() => runAction(item.onSelect)}
              >
                <item.icon className="h-4 w-4 text-[#8C2044]" />
                <span>{item.label}</span>
                {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Acoes Rapidas">
            {actionItems.map((item) => (
              <CommandItem
                key={item.label}
                className="rounded-2xl px-3 py-3"
                onSelect={() => runAction(item.onSelect)}
              >
                <item.icon className="h-4 w-4 text-[#8C2044]" />
                <span>{item.label}</span>
                {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>

          {wineResults.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading={isCommercial ? "Produtos em Destaque" : "Rotulos em Destaque"}>
                {wineResults.map((wine) => (
                  <CommandItem
                    key={wine.id}
                    className="rounded-2xl px-3 py-3"
                    value={`${wine.name} ${wine.producer ?? ""} ${wine.country ?? ""} ${wine.region ?? ""}`}
                    onSelect={() => handleNavigateToWine(wine.name)}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#8C2044]/10 text-[#8C2044]">
                      <Wine className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-[#17141D]">{wine.name}</span>
                      <span className="truncate text-[12px] text-[#7A7080]">
                        {[wine.producer, wine.vintage, wine.region || wine.country].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <CommandShortcut>{wine.quantity} un.</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
