import Link from "next/link";

export default function AnalyticsNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Analytics Page Not Found
          </h2>
          <p className="text-gray-600">
            The analytics page you&apos;re looking for doesn&apos;t exist or has
            been moved.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/analytics"
            className="inline-block bg-buttonActive text-white px-6 py-3 rounded-lg font-medium hover:bg-buttonActive/90 transition-colors"
          >
            Go to Analytics Dashboard
          </Link>

          <div className="text-sm text-gray-500">
            or{" "}
            <Link href="/" className="text-buttonActive hover:underline">
              return to main dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
