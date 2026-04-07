import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/40 shimmer-premium motion-reduce:animation-none motion-reduce:bg-muted/25",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
