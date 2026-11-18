import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CapacityMatrixSkeletonProps {
  rowCount?: number;
  columnCount?: number;
}

export function CapacityMatrixSkeleton({
  rowCount = 6,
  columnCount = 14
}: CapacityMatrixSkeletonProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6 w-24" />
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="w-full">
            {/* Header row */}
            <div className="flex border-b pb-2 mb-2">
              <div className="min-w-[150px] p-2">
                <Skeleton className="h-5 w-12" />
              </div>
              {Array.from({ length: columnCount }).map((_, i) => (
                <div key={i} className="min-w-[80px] p-2 text-center">
                  <Skeleton className="h-4 w-8 mx-auto mb-1" />
                  <Skeleton className="h-5 w-5 mx-auto" />
                </div>
              ))}
            </div>

            {/* Body rows */}
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex border-b py-1"
                style={{
                  animationDelay: `${rowIndex * 100}ms`,
                  opacity: 1 - (rowIndex * 0.1)
                }}
              >
                <div className="min-w-[150px] p-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-24 mt-1 ml-5" />
                </div>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <div key={colIndex} className="min-w-[80px] p-1">
                    <Skeleton
                      className="h-12 w-full rounded-md"
                      style={{
                        animationDelay: `${(rowIndex * columnCount + colIndex) * 20}ms`
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline skeleton for individual cells when updating
export function CellSkeleton() {
  return (
    <div className="rounded-md p-2 bg-muted animate-pulse">
      <Skeleton className="h-4 w-8 mx-auto mb-1" />
      <Skeleton className="h-3 w-12 mx-auto" />
    </div>
  );
}
