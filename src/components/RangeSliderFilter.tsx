import { useState, useCallback } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface RangeSliderFilterProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (v: number) => string;
}

export function RangeSliderFilter({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue = (v) => String(v),
}: RangeSliderFilterProps) {
  const [local, setLocal] = useState(value);
  const [dragging, setDragging] = useState(false);

  const displayed = dragging ? local : value;
  const isActive = value[0] !== min || value[1] !== max;

  const handleChange = useCallback(
    (v: number[]) => {
      const tuple: [number, number] = [v[0], v[1]];
      setLocal(tuple);
    },
    []
  );

  const handleCommit = useCallback(
    (v: number[]) => {
      const tuple: [number, number] = [v[0], v[1]];
      onChange(tuple);
      setDragging(false);
    },
    [onChange]
  );

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider transition-colors",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span className="text-[10px] font-extrabold text-foreground tabular-nums">
          {formatValue(displayed[0])} — {formatValue(displayed[1])}
        </span>
      </div>
      <SliderPrimitive.Root
        min={min}
        max={max}
        step={step}
        value={displayed}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        onPointerDown={() => setDragging(true)}
        className="relative flex w-full touch-none select-none items-center group h-3"
      >
        <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-muted/50">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-wine to-[hsl(var(--wine-vivid))]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-[12px] w-[12px] rounded-full border-2 border-wine bg-background shadow-md ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing active:scale-105" />
        <SliderPrimitive.Thumb className="block h-[12px] w-[12px] rounded-full border-2 border-wine bg-background shadow-md ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing active:scale-105" />
      </SliderPrimitive.Root>
    </div>
  );
}
