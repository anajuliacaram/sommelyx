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
    <div className="w-full rounded-[16px] border border-white/50 ring-1 ring-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.88)_52%,rgba(248,244,237,0.90)_100%)] px-3 py-2.5 shadow-[0_18px_38px_-28px_rgba(58,51,39,0.22),0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-2xl saturate-150">
      <div className="flex items-center justify-between">
        <span
          className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-neutral-600 transition-colors"
        >
          {label}
        </span>
        <span className="text-[12px] font-semibold tabular-nums text-neutral-900">
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
        className="group relative mt-2 flex h-3 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-[4px] w-full grow overflow-hidden rounded-full bg-black/5">
          <SliderPrimitive.Range className="absolute h-full bg-[linear-gradient(90deg,rgba(123,30,43,0.92),rgba(95,111,82,0.82))]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-[13px] w-[13px] cursor-grab rounded-full border border-[rgba(123,30,43,0.26)] bg-white shadow-[0_2px_8px_rgba(20,18,16,0.10)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(95,111,82,0.16)] active:scale-105 active:cursor-grabbing" />
        <SliderPrimitive.Thumb className="block h-[13px] w-[13px] cursor-grab rounded-full border border-[rgba(123,30,43,0.26)] bg-white shadow-[0_2px_8px_rgba(20,18,16,0.10)] transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(95,111,82,0.16)] active:scale-105 active:cursor-grabbing" />
      </SliderPrimitive.Root>
    </div>
  );
}
