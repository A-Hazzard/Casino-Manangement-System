import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Specific skeleton component for Login Page
 * Matches the exact layout of the login page with logo, form, and image
 */
export const LoginPageSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl bg-white">
      <div className="flex flex-col md:flex-row">
        {/* Left side - Login form */}
        <div className="w-full md:w-1/2 p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-6">
              {/* Logo skeleton */}
              <Skeleton className="h-20 w-40 mx-auto mb-6" />
            </div>

            {/* Login form skeleton - matches LoginForm.tsx exactly */}
            {/* Title - "Login" (h2 mb-6 text-2xl font-bold) */}
            <div className="text-left">
              <Skeleton className="h-8 w-20 mb-6" />
            </div>

            {/* Form with space-y-6 */}
            <div className="space-y-6">
              {/* Email or Username field */}
              <div>
                <Skeleton className="h-5 w-36 mb-1" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Password field */}
              <div>
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-56 ml-2" />
              </div>

              {/* Login button */}
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="relative w-full md:w-1/2 min-h-[250px] md:min-h-0">
          <Skeleton className="absolute inset-0 w-full h-full" />
          <div className="absolute bottom-10 left-10 pr-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
