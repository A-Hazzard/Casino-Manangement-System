import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SMIBManagementSkeleton() {
  return (
    <div className="flex min-h-[80vh] w-full max-w-full flex-col gap-6">
      {/* Header Skeleton */}
      <div className="rounded-lg bg-buttonActive p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-white/20" />
          <Skeleton className="h-8 w-8 rounded-md bg-white/20" />
        </div>
        <Skeleton className="h-11 w-full bg-white/90" />
      </div>

      {/* Configuration Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Network Config Card Skeleton */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32 sm:col-start-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* COMS Config Card Skeleton */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32 sm:col-start-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* MQTT Topics Card Skeleton */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Info Box */}
              <div className="rounded-md bg-gray-50 p-3">
                <Skeleton className="mb-2 h-4 w-24" />
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-40" />
                  ))}
                </div>
              </div>

              {/* Topics */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48 sm:col-start-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

