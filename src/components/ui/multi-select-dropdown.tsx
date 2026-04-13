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
                        "h-[30px] px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all duration-200 hover:-translate-y-[1px]",
                        hasSelection
                            ? "bg-[hsl(var(--wine)/0.10)] text-[hsl(var(--wine))] border-[hsl(var(--wine)/0.22)] shadow-[0_2px_10px_-3px_hsl(var(--wine)/0.18),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-lg"
                            : "bg-white/70 backdrop-blur-lg hover:bg-white/90 border-white/40 text-[hsl(var(--wine)/0.50)] hover:text-[hsl(var(--wine)/0.85)] shadow-[0_1px_4px_-1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_3px_10px_-3px_hsl(var(--wine)/0.10),inset_0_1px_0_rgba(255,255,255,0.6)]"
                    )}
                >
                    <span className="truncate max-w-[80px]">{triggerLabel}</span>
                    <ChevronDown className={cn("h-3 w-3 opacity-40 shrink-0 transition-transform duration-200", open && "rotate-180")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={6}
                className="w-[250px] p-2.5 rounded-2xl shadow-[0_20px_60px_-15px_rgba(30,20,20,0.16),0_4px_12px_rgba(30,20,20,0.04)] bg-white/95 backdrop-blur-2xl border border-white/50"
            >
                <div className="flex flex-col gap-1.5">
                    {/* Sort toggle + search */}
                    <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
                        {showSearch && (
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--wine)/0.35)]" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-8 pl-8 rounded-xl bg-[hsl(var(--cream)/0.5)] border-[hsl(var(--border)/0.20)] text-[12px] text-foreground placeholder:text-[hsl(var(--wine)/0.25)] focus:border-[hsl(var(--wine)/0.25)] focus:ring-[hsl(var(--wine)/0.06)]"
                                />
                            </div>
                        )}
                        {!showSearch ? <div className="flex-1" /> : null}
                        <div className="flex rounded-xl bg-[hsl(var(--cream)/0.6)] p-0.5 shrink-0 border border-white/30">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSortMode("alpha")}
                                className={cn(
                                    "h-7 w-7 rounded-lg transition-all duration-150",
                                    sortMode === "alpha" ? "bg-white shadow-sm text-[hsl(var(--wine))]" : "text-[hsl(var(--wine)/0.35)] hover:text-[hsl(var(--wine)/0.65)]"
                                )}
                                title="Ordem alfabética"
                            >
                                <ArrowDownAZ className="h-3.5 w-3.5" />
                            </Button>
                            {hasCounts && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSortMode("count")}
                                    className={cn(
                                        "h-7 w-7 rounded-lg transition-all duration-150",
                                        sortMode === "count" ? "bg-white shadow-sm text-[hsl(var(--wine))]" : "text-[hsl(var(--wine)/0.35)] hover:text-[hsl(var(--wine)/0.65)]"
                                    )}
                                    title="Ordenar por quantidade"
                                >
                                    <ArrowDown01 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="max-h-[220px] px-0.5">
                        <div className="space-y-0.5">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-[12px] text-[hsl(var(--wine)/0.35)] font-medium">
                                    Nenhum resultado
                                </div>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isChecked = selected.includes(opt.value)
                                    return (
                                        <div
                                            key={opt.value}
                                            className={cn(
                                                "flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150",
                                                isChecked
                                                    ? "bg-[hsl(var(--wine)/0.07)] text-[hsl(var(--wine))]"
                                                    : "hover:bg-[hsl(var(--cream)/0.5)] text-foreground/75"
                                            )}
                                            onClick={() => onChange(opt.value)}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className={cn(
                                                    "pointer-events-none rounded-md h-4 w-4 border-[hsl(var(--wine)/0.20)] transition-colors duration-150",
                                                    isChecked && "border-[hsl(var(--wine))] bg-[hsl(var(--wine))] text-white"
                                                )}
                                            />
                                            <span className={cn(
                                                "text-[12px] leading-none flex-1 mt-px truncate transition-all duration-150",
                                                isChecked ? "font-bold" : "font-medium"
                                            )}>
                                                {opt.label}
                                            </span>
                                            {opt.count !== undefined && (
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[24px] text-center transition-colors duration-150",
                                                    isChecked
                                                        ? "bg-[hsl(var(--wine)/0.12)] text-[hsl(var(--wine))]"
                                                        : "bg-[hsl(var(--cream-dark)/0.35)] text-[hsl(var(--wine)/0.40)]"
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
                        <div className="pt-1.5 mt-0.5 border-t border-[hsl(var(--wine)/0.08)] px-1 pb-0.5">
                            <Button
                                variant="ghost"
                                className="w-full h-7 text-[11px] font-bold text-[hsl(var(--wine)/0.60)] hover:text-[hsl(var(--wine))] hover:bg-[hsl(var(--wine)/0.05)] justify-center rounded-xl transition-all duration-150"
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
