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

export function AdministrationUserSummaryCards({
  counts,
  isLoading,
}: AdministrationUserSummaryCardsProps) {
  if (isLoading) {
    return (
      <>
        {/* Mobile: 3 combined cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex-1 space-y-2 border-l pl-4">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Desktop: 5 individual cards */}
        <div className="mb-6 hidden gap-4 lg:grid lg:grid-cols-5">
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
      </>
    );
  }

  return (
    <>
      {/* Mobile: 3 combined cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:hidden">
        {/* Users + Collectors */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-600">Total Users</span>
                  <Users className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{counts?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">All users</p>
              </div>
              <div className="min-w-0 flex-1 border-l pl-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-600">Collectors</span>
                  <UserCog className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{counts?.collectors ?? 0}</div>
                <p className="text-xs text-muted-foreground">Collector role</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admins + Location Admins */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-600">Total Admins</span>
                  <Shield className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{counts?.admins ?? 0}</div>
                <p className="text-xs text-muted-foreground">Admin &amp; Developer</p>
              </div>
              <div className="min-w-0 flex-1 border-l pl-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-600">Location Admins</span>
                  <Building2 className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{counts?.locationAdmins ?? 0}</div>
                <p className="text-xs text-muted-foreground">Location admin role</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Managers standalone */}
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

      {/* Desktop: 5 individual cards */}
      <div className="mb-6 hidden gap-4 lg:grid lg:grid-cols-5">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.admins ?? 0}</div>
            <p className="text-xs text-muted-foreground">Admin &amp; Developer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Location Admins</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.locationAdmins ?? 0}</div>
            <p className="text-xs text-muted-foreground">Location admin role</p>
          </CardContent>
        </Card>

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
    </>
  );
}
