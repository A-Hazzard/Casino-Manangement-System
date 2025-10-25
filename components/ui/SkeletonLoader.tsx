export default function StatCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex-1 rounded-lg bg-container px-4 py-6 shadow-md"
        >
          <div className="skeleton-bg mx-auto h-6 w-1/3"></div>
        </div>
      ))}
    </>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex-1 rounded-lg bg-container p-6 shadow-md">
      {/* Single responsive skeleton div for the chart area */}
      <div className="skeleton-bg h-[320px] w-full rounded-md"></div>
    </div>
  );
}
