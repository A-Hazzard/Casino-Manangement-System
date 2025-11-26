/**
 * Map Loader Component
 * Loading skeleton component for map preview.
 *
 * Features:
 * - Map loading skeleton
 * - Search bar skeleton
 * - Legend skeleton
 * - Card layout
 *
 * @param title - Map title
 * @param description - Map description
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

type MapLoaderProps = {
  title?: string;
  description?: string;
};

export default function MapLoader({
  title = 'Location Performance Map',
  description = 'Interactive map showing casino location performance metrics',
}: MapLoaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search bar skeleton */}
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="w-full lg:w-72">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

          {/* Map container skeleton */}
          <div className="min-h-[400px] overflow-hidden rounded-lg lg:min-h-[32rem]">
            <Skeleton className="h-full w-full" />
          </div>

          {/* Legend skeleton */}
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
