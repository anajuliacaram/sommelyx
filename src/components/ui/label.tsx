import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("mb-1.5 block text-[11px] font-semibold uppercase leading-none text-[rgba(58,51,39,0.5)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70", {
  variants: {},
  defaultVariants: {},
});

// letter-spacing 0.12em applied via inline below in component to ensure no Tailwind conflict

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} style={{ letterSpacing: "0.12em" }} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
