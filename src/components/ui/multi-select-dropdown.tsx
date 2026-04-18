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
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-10 px-3.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 border transition-all duration-200 ease-out hover:-translate-y-px active:scale-[0.98]",
                        hasSelection
                            ? "bg-[rgba(123,30,43,0.08)] text-[#7B1E2B] border-[#7B1E2B] hover:bg-[rgba(123,30,43,0.12)]"
                            : "bg-[rgba(255,255,255,0.7)] text-[#3A3327] border-[rgba(95,111,82,0.15)] hover:bg-black/[0.04] hover:border-[rgba(95,111,82,0.25)]"
                    )}
                >
                    <span className="truncate max-w-[120px]">{triggerLabel}</span>
                    {hasSelection && selected.length > 1 && (
                        <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#7B1E2B] px-1 text-[9px] font-bold text-white">
                            {selected.length}
                        </span>
                    )}
                    <ChevronDown className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        hasSelection ? "opacity-70" : "opacity-45",
                        open && "rotate-180"
                    )} />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                avoidCollisions={false}
                sideOffset={6}
                className="w-[92vw] max-w-[280px] sm:w-[260px] p-3 rounded-[18px] shadow-[0_18px_40px_-22px_rgba(58,51,39,0.20)] bg-[rgba(255,255,255,0.96)] border border-[rgba(95,111,82,0.10)] backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[side=bottom]:slide-in-from-top-1"
            >
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-0.5">
                        {showSearch && (
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 pl-8 rounded-[14px] bg-white border-neutral-200 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:border-[#6F7F5B] focus:ring-[#6F7F5B]/20 focus:shadow-[0_0_0_3px_rgba(111,127,91,0.08)]"
                                />
                            </div>
                        )}
                        {!showSearch ? <div className="flex-1" /> : null}
                        <div className="flex rounded-full bg-white p-0.5 shrink-0 border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.022)]">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setSortMode("alpha")}
                                className={cn(
                                    "h-6 w-6 rounded-full transition-[transform,background-color,color] duration-150",
                                    sortMode === "alpha" ? "bg-[#6F7F5B] shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-white" : "text-neutral-500 hover:text-neutral-800"
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
                                    sortMode === "count" ? "bg-[#6F7F5B] shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-white" : "text-neutral-500 hover:text-neutral-800"
                                )}
                                title="Ordenar por quantidade"
                            >
                                    <ArrowDown01 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="max-h-[240px]">
                        <div className="space-y-1">
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
                                                "flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-colors duration-150",
                                                isChecked
                                                    ? "bg-[rgba(123,30,43,0.06)] text-[#7B1E2B]"
                                                    : "hover:bg-black/[0.04] text-[#3A3327]"
                                            )}
                                            onClick={() => onChange(opt.value)}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                className={cn(
                                                    "pointer-events-none rounded h-3.5 w-3.5 transition-colors duration-150",
                                                    isChecked
                                                        ? "border-[#7B1E2B] bg-[#7B1E2B] text-white"
                                                        : "border-neutral-300"
                                                )}
                                            />
                                            <span className={cn(
                                                "text-[12px] leading-normal flex-1 truncate",
                                                isChecked ? "font-semibold" : "font-medium"
                                            )}>
                                                {opt.label}
                                            </span>
                                            {opt.count !== undefined && (
                                                <span className={cn(
                                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                                                    isChecked
                                                        ? "bg-[rgba(123,30,43,0.10)] text-[#7B1E2B]"
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
                        <div className="pt-1 border-t border-[rgba(95,111,82,0.12)] px-0.5">
                            <Button
                                variant="ghost"
                                className="w-full h-8 text-[11px] font-semibold text-[#7B1E2B] hover:text-[#5A1420] hover:bg-[rgba(123,30,43,0.06)] justify-center rounded-[10px] transition-colors duration-150"
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
