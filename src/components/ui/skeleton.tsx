import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "relative overflow-hidden rounded-[16px] bg-card/80 border border-border/70 shimmer-premium motion-reduce:animation-none motion-reduce:bg-muted/30",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
