import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

export function MobileCollectionModalSkeleton() {
  return (
    <Dialog open={true}>
      <DialogContent className="flex h-full max-h-full max-w-full flex-col bg-container p-0 md:hidden">
        {/* Header Skeleton */}
        <DialogHeader className="border-b border-gray-200 bg-white p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </DialogHeader>

        {/* Content Skeleton */}
        <div className="flex-1 space-y-4 overflow-hidden p-4">
          {/* Title Section */}
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-6 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>

          {/* Search Input */}
          <Skeleton className="h-12 w-full rounded-lg" />

          {/* Cards Grid */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                {/* Card Header */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </div>

                {/* Card Content */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Location Selector Skeleton
export function LocationSelectorSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-6 w-32" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>

      {/* Search Input */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Location Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Machine Selector Skeleton
export function MachineSelectorSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="mx-auto h-4 w-56" />
      </div>

      {/* Search Input */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Machine Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 p-2">
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 rounded" />
                <Skeleton className="h-8 flex-1 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Machine Data Form Skeleton
export function MachineDataFormSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Machine Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Collection Time */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Meter Readings */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* RAM Clear Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

// Collected Machines List Skeleton
export function CollectedMachinesListSkeleton() {
  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl">
        {/* Handle Bar */}
        <div className="flex justify-center pb-2 pt-3">
          <Skeleton className="h-1 w-12 rounded-full" />
        </div>

        {/* Header */}
        <div className="border-b border-gray-200 px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <Skeleton className="mx-auto h-8 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="mx-auto h-8 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="mx-auto h-8 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Machines List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
