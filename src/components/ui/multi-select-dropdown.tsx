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
}

export function MultiSelectDropdown({
    title,
    options,
    selected,
    onChange,
    onClear,
    searchPlaceholder = "Buscar...",
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

    // Formatting trigger label
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
                        "h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 border-border/50 transition-all",
                        hasSelection ? "bg-primary/10 text-primary border-primary/20 shadow-sm" : "bg-card/80 hover:bg-card hover:border-border"
                    )}
                >
                    <span className="truncate max-w-[100px]">{triggerLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[240px] p-2 rounded-2xl shadow-premium bg-card/95 backdrop-blur-xl border border-border/50"
            >
                <div className="flex flex-col gap-1.5">
                    {/* Sort toggle + search */}
                    <div className="flex items-center gap-1.5 px-1 pt-0.5">
                        {options.length > 5 && (
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-8 pl-8 rounded-lg bg-muted/30 border-none text-[12px]"
                                />
                            </div>
                        )}
                        {!options.length || options.length <= 5 ? <div className="flex-1" /> : null}
                        <div className="flex rounded-lg bg-muted/30 p-0.5 shrink-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSortMode("alpha")}
                                className={cn(
                                    "h-7 w-7 rounded-md",
                                    sortMode === "alpha" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
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
                                        "h-7 w-7 rounded-md",
                                        sortMode === "count" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Ordenar por quantidade"
                                >
                                    <ArrowDown01 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="max-h-[220px] px-1">
                        <div className="space-y-0.5">
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-sm text-muted-foreground">
                                    Nenhum resultado
                                </div>
                            ) : (
                                filteredOptions.map((opt) => {
                                    const isChecked = selected.includes(opt.value)
                                    return (
                                        <div
                                            key={opt.value}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => onChange(opt.value)}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className="pointer-events-none rounded-md h-4 w-4"
                                            />
                                            <span className="text-[12px] font-medium leading-none flex-1 mt-px truncate">
                                                {opt.label}
                                            </span>
                                            {opt.count !== undefined && (
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">
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
                        <div className="pt-1.5 mt-0.5 border-t border-border/30 px-1 pb-0.5">
                            <Button
                                variant="ghost"
                                className="w-full h-7 text-[11px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 justify-center rounded-lg"
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
