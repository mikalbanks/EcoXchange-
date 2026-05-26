interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className = "" }: ShimmerProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-paleGreen/40 ${className}`}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-5">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="h-8 w-32 mt-3" />
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-6 space-y-4">
      <div className="flex justify-between gap-3">
        <div className="space-y-2">
          <Shimmer className="h-6 w-64" />
          <Shimmer className="h-4 w-48" />
        </div>
        <Shimmer className="h-7 w-24 rounded-full" />
      </div>
      <Shimmer className="h-4 w-40" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-6 w-28" />
        </div>
        <div className="space-y-2">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-6 w-28" />
        </div>
      </div>
      <Shimmer className="h-4 w-28" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-5 space-y-4">
      <Shimmer className="h-5 w-40" />
      <Shimmer className="h-72 w-full" />
    </div>
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-5 space-y-3">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-6 w-28" />
      <Shimmer className="h-6 w-24 rounded-full" />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 overflow-hidden">
      <Shimmer className="h-10 w-full rounded-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-12 w-full rounded-none mt-px" />
      ))}
    </div>
  );
}
