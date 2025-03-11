export default function MapSkeleton() {
    return (
        <div className="relative p-4 rounded-lg shadow-md bg-container w-full animate-pulse">
            <div className="absolute top-8 right-5 w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="mt-2 h-48 w-full rounded-lg bg-gray-300"></div>
        </div>
    );
}
