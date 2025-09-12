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
            
            {/* Login form skeleton */}
            <div className="space-y-6">
              {/* Title */}
              <div className="text-center">
                <Skeleton className="h-8 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
              
              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              {/* Login button */}
              <Skeleton className="h-10 w-full" />
              
              {/* Additional links */}
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
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
