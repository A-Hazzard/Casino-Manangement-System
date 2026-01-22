/**
 * Administration User Summary Cards Component
 *
 * Displays summary cards for user counts by role.
 *
 * @module components/administration/AdministrationUserSummaryCards
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Users, UserCog, Building2, Shield, Briefcase } from 'lucide-react';

export type AdministrationUserSummaryCardsProps = {
  counts: {
    total: number;
    collectors: number;
    admins: number;
    locationAdmins: number;
    managers: number;
  } | null;
  isLoading: boolean;
};

/**
 * Administration User Summary Cards
 */
export function AdministrationUserSummaryCards({
  counts,
  isLoading,
}: AdministrationUserSummaryCardsProps) {
  // ============================================================================
  // Render
  // ============================================================================
  if (isLoading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts?.total ?? 0}</div>
          <p className="text-xs text-muted-foreground">All users</p>
        </CardContent>
      </Card>

      {/* Total Collectors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
          <UserCog className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts?.collectors ?? 0}</div>
          <p className="text-xs text-muted-foreground">Collector role</p>
        </CardContent>
      </Card>

      {/* Total Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts?.admins ?? 0}</div>
          <p className="text-xs text-muted-foreground">Admin & Developer</p>
        </CardContent>
      </Card>

      {/* Total Location Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Location Admins
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts?.locationAdmins ?? 0}</div>
          <p className="text-xs text-muted-foreground">Location admin role</p>
        </CardContent>
      </Card>

      {/* Total Managers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts?.managers ?? 0}</div>
          <p className="text-xs text-muted-foreground">Manager role</p>
        </CardContent>
      </Card>
    </div>
  );
}

