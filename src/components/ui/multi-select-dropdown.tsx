import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Option {
    label: string
    value: string
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

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    )

    const hasSelection = selected.length > 0
    const isAllSelected = selected.length === options.length && options.length > 0

    const handleToggleAll = () => {
        if (isAllSelected) {
            onClear()
        } else {
            const missing = options.filter(opt => !selected.includes(opt.value))
            missing.forEach(opt => onChange(opt.value))
        }
    }

    // Formatting trigger label
    let triggerLabel = title
    if (selected.length === 1) {
        const opt = options.find(o => o.value === selected[0])
        triggerLabel = opt ? opt.label : title
    } else if (selected.length === 2) {
        const opt1 = options.find(o => o.value === selected[0])
        const opt2 = options.find(o => o.value === selected[1])
        if (opt1 && opt2) {
            // Very short names might fit. Otherwise fallback to name + 1
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
                        "h-10 px-4 rounded-[12px] text-[13px] font-semibold flex items-center gap-2 border-border/50 transition-all",
                        hasSelection ? "bg-primary/10 text-primary border-primary/20 shadow-sm" : "bg-card/80 hover:bg-card hover:border-border"
                    )}
                >
                    <span className="truncate max-w-[120px]">{triggerLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[260px] p-2 rounded-[20px] shadow-premium bg-card/95 backdrop-blur-xl border border-border/50"
            >
                <div className="flex flex-col gap-2">
                    {options.length > 10 && (
                        <div className="relative px-2 pt-1 pb-2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 pl-9 rounded-xl bg-muted/30 border-none text-[13px]"
                            />
                        </div>
                    )}

                    <ScrollArea className="max-h-[220px] px-1">
                        <div className="space-y-1">
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
                                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => onChange(opt.value)}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                // Pointer events none here because outer div handles click
                                                className="pointer-events-none rounded-md"
                                            />
                                            <span className="text-[13px] font-medium leading-none flex-1 mt-px">
                                                {opt.label}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>

                    {hasSelection && (
                        <div className="pt-2 mt-1 border-t border-border/30 px-1 pb-1">
                            <Button
                                variant="ghost"
                                className="w-full h-8 text-[12px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 justify-center rounded-lg"
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
