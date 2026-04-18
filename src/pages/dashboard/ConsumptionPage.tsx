import { useConsumption } from "@/hooks/useConsumption";
import { ConsumptionTimeline } from "@/components/ConsumptionTimeline";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConsumptionPage() {
  const { data: entries, isLoading } = useConsumption();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[24px] bg-white p-7 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full bg-black/5" />
            <Skeleton className="h-7 w-52 rounded-full bg-black/5" />
            <Skeleton className="h-4 w-64 rounded-full bg-black/5" />
          </div>
          <div className="mt-6 flex flex-col gap-5">
            {[1, 2, 3].map((month) => (
              <div key={month} className="space-y-3">
                <Skeleton className="h-4 w-36 rounded-full bg-black/5" />
                <div className="space-y-1">
                  {[1, 2, 3].map((row) => (
                    <Skeleton key={row} className="h-12 w-full rounded-none bg-black/[0.04]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ConsumptionTimeline entries={entries ?? []} />
    </div>
  );
}
