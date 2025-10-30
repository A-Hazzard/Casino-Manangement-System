import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SMIBManagementSkeleton() {
  return (
    <div className="flex min-h-[80vh] w-full max-w-full flex-col gap-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 rounded-lg bg-buttonActive p-4">
        {/* Title and Refresh Button */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-white/20" />
          <Skeleton className="h-8 w-8 rounded-md bg-white/20" />
        </div>

        {/* Search Bar and Location Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <Skeleton className="h-11 w-full bg-white/90" />
          </div>
          <div className="w-full sm:w-64">
            <Skeleton className="h-11 w-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Configuration Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Network Config Card Skeleton */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-32" />
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
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-32" />
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
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-32" />
              
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

      {/* SMIB Operations & Management Section */}
      <div className="mt-8 space-y-6">
        <Skeleton className="h-7 w-64" />

        {/* Operations Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Restart Section Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-36" />
                </div>
              </CardContent>
            </Card>

            {/* Meter Data Section Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex flex-wrap items-center gap-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="rounded-md bg-blue-50 p-3">
                  <Skeleton className="mb-2 h-4 w-12" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* OTA Update Section Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-44" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                
                <div className="space-y-3">
                  <div>
                    <Skeleton className="mb-2 h-4 w-40" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-44" />
                  </div>
                </div>

                <div className="rounded-md bg-purple-50 p-3">
                  <Skeleton className="mb-2 h-4 w-20" />
                  <div className="ml-4 mt-1 space-y-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-3 w-full" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

