import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Specific skeleton component for Login Page
 * Matches the exact layout of the login page with logo, form, and image
 */
export const LoginPageSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex flex-col md:flex-row">
        {/* Left side - Login form */}
        <div className="w-full p-12 md:w-1/2">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 text-center">
              {/* Logo skeleton */}
              <Skeleton className="mx-auto mb-6 h-20 w-40" />
            </div>

            {/* Login form skeleton - matches LoginForm.tsx exactly */}
            {/* Title - "Login" (h2 mb-6 text-2xl font-bold) */}
            <div className="text-left">
              <Skeleton className="mb-6 h-8 w-20" />
            </div>

            {/* Form with space-y-6 */}
            <div className="space-y-6">
              {/* Email or Username field */}
              <div>
                <Skeleton className="mb-1 h-5 w-36" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Password field */}
              <div>
                <Skeleton className="mb-1 h-5 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="ml-2 h-4 w-56" />
              </div>

              {/* Login button */}
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="relative min-h-[250px] w-full md:min-h-0 md:w-1/2">
          <Skeleton className="absolute inset-0 h-full w-full" />
          <div className="absolute bottom-10 left-10 pr-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
