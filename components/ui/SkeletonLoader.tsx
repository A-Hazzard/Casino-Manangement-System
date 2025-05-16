export default function StatCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex-1 px-4 py-6 bg-container shadow-md rounded-lg"
        >
          <div className="h-6 w-1/3 mx-auto skeleton-bg"></div>
        </div>
      ))}
    </>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-container p-6 rounded-lg shadow-md flex-1">
      {/* Single responsive skeleton div for the chart area */}
      <div className="w-full h-[320px] skeleton-bg rounded-md"></div>
    </div>
  );
}
