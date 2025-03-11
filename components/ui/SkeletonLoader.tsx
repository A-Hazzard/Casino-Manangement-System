export default function StatCardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="flex-1 px-4 py-6 bg-container shadow-md rounded-lg animate-pulse">
                    <div className="h-6 bg-gray-300 rounded w-1/3 mx-auto"></div>
                </div>
            ))}
        </>
    );
}
