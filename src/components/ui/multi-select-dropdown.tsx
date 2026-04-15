import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronDown, ArrowDownAZ, ArrowDown01 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Option {
    label: string
    value: string
    count?: number
}

interface MultiSelectDropdownProps {
    title: string
    options: Option[]
    selected: string[]
    onChange: (value: string) => void
    onClear: () => void
    searchPlaceholder?: string
    searchable?: boolean
}

export function MultiSelectDropdown({
    title,
    options,
    selected,
    onChange,
    onClear,
    searchPlaceholder = "Buscar...",
    searchable,
}: MultiSelectDropdownProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [sortMode, setSortMode] = React.useState<"alpha" | "count">("alpha")

    const filteredOptions = React.useMemo(() => {
        let filtered = options.filter((opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
        )
        if (sortMode === "count") {
            filtered = [...filtered].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
        } else {
            filtered = [...filtered].sort((a, b) => a.label.localeCompare(b.label))
        }
        return filtered
    }, [options, search, sortMode])

    const hasSelection = selected.length > 0
    const hasCounts = options.some(o => o.count !== undefined)
    const showSearch = (searchable ?? (options.length > 5)) && options.length > 0

    let triggerLabel = title
    if (selected.length === 1) {
        const opt = options.find(o => o.value === selected[0])
        triggerLabel = opt ? opt.label : title
    } else if (selected.length === 2) {
        const opt1 = options.find(o => o.value === selected[0])
        const opt2 = options.find(o => o.value === selected[1])
        if (opt1 && opt2) {
            if (opt1.label.length + opt2.label.length < 15) {
                triggerLabel = `${opt1.label}, ${opt2.label}`
            } else {
                triggerLabel = `${opt1.label} +1`
            }
        }
    } else if (selected.length > 2) {
        const opt = options.find(o => o.value === selected[0])
        triggerLabel = opt ? `${opt.label} +${selected.length - 1}` : `${title} (${selected.length})`
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={hasSelection ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                        "h-[28px] px-3 py-1 rounded-full text-[9.25px] font-semibold flex items-center gap-1 border transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out active:scale-[0.98]",
                        hasSelection
                            ? "bg-[hsl(var(--wine))] text-white border-[hsl(var(--wine))] shadow-[0_4px_12px_hsl(var(--wine)/0.16)] hover:brightness-110"
                            : "bg-[rgba(255,255,255,0.72)] text-foreground/82 border-white/14 shadow-[0_1px_2px_rgba(0,0,0,0.022)] hover:bg-[rgba(255,255,255,0.80)] hover:border-white/18 hover:text-foreground"
                    )}
                >
                    <span className="truncate max-w-[80px]">{triggerLabel}</span>
                    <ChevronDown className={cn(
                        "h-3 w-3 shrink-0 transition-transform duration-200",
                        hasSelection ? "opacity-70" : "opacity-50",
                        open && "rotate-180"
                    )} />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                avoidCollisions={false}
                sideOffset={4}
                className="w-[220px] p-2 rounded-[18px] shadow-[0_16px_36px_-28px_rgba(0,0,0,0.18)] bg-[rgba(255,255,255,0.94)] border border-white/16 backdrop-blur-xl"
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 px-0.5">
                        {showSearch && (
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-7 pl-7 rounded-[12px] bg-[rgba(255,255,255,0.72)] border-white/14 text-[11px] text-foreground placeholder:text-muted-foreground/45 focus:border-[hsl(var(--wine)/0.28)] focus:ring-[hsl(var(--wine)/0.08)]"
                                />
                            </div>
                        )}
                        {!showSearch ? <div className="flex-1" /> : null}
                        <div className="flex rounded-full bg-[rgba(255,255,255,0.68)] p-0.5 shrink-0 border border-white/14 shadow-[0_1px_2px_rgba(0,0,0,0.022)]">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSortMode("alpha")}
                                className={cn(
                                    "h-6 w-6 rounded-full transition-[transform,background-color,color] duration-150",
                                    sortMode === "alpha" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-[hsl(var(--wine))]" : "text-muted-foreground/55 hover:text-foreground/75"
                                )}
                                title="Ordem alfabética"
                            >
                                <ArrowDownAZ className="h-3 w-3" />
                            </Button>
                            {hasCounts && (
                                <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSortMode("count")}
                                className={cn(
                                    "h-6 w-6 rounded-full transition-[transform,background-color,color] duration-150",
                                    sortMode === "count" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-[hsl(var(--wine))]" : "text-muted-foreground/55 hover:text-foreground/75"
                                )}
                                title="Ordenar por quantidade"
                            >
                                    <ArrowDown01 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="max-h-[200px]">
                        <div className="space-y-px">
                            {filteredOptions.length === 0 ? (
                                <div className="p-2 text-center text-[11px] text-muted-foreground/50 font-medium">
                                    Nenhum resultado
                                </div>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isChecked = selected.includes(opt.value)
                                    return (
                                        <div
                                            key={opt.value}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 rounded-[12px] cursor-pointer transition-[background-color,color,transform] duration-150",
                                                isChecked
                                                    ? "bg-[hsl(var(--wine)/0.08)] text-[hsl(var(--wine))]"
                                                    : "hover:bg-[rgba(255,255,255,0.72)] text-foreground/80"
                                            )}
                                            onClick={() => onChange(opt.value)}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className={cn(
                                                    "pointer-events-none rounded h-3.5 w-3.5 transition-colors duration-150",
                                                    isChecked
                                                        ? "border-[hsl(var(--wine))] bg-[hsl(var(--wine))] text-white"
                                                        : "border-border/60"
                                                )}
                                            />
                                            <span className={cn(
                                                "text-[11px] leading-normal flex-1 truncate",
                                                isChecked ? "font-bold" : "font-medium"
                                            )}>
                                                {opt.label}
                                            </span>
                                            {opt.count !== undefined && (
                                                <span className={cn(
                                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                                                    isChecked
                                                        ? "bg-[hsl(var(--wine)/0.15)] text-[hsl(var(--wine))]"
                                                        : "bg-muted/50 text-muted-foreground/60"
                                                )}>
                                                    {opt.count}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>

                    {hasSelection && (
                        <div className="pt-1 border-t border-border/20 px-0.5">
                            <Button
                                variant="ghost"
                                className="w-full h-6 text-[10px] font-semibold text-[hsl(var(--wine)/0.70)] hover:text-[hsl(var(--wine))] hover:bg-[hsl(var(--wine)/0.05)] justify-center rounded-[12px] transition-[background-color,color,transform] duration-150"
                                onClick={() => {
                                    onClear()
                                    setOpen(false)
                                }}
                            >
                                Limpar seleção
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
