import LiquidGradient from '@/components/ui/LiquidGradient';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Specific skeleton component for Login Page
 * Matches the exact layout of the login page with logo, form, and image
 */
export const LoginPageSkeleton = () => (
  <>
    <LiquidGradient />
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col md:flex-row">
          {/* Left side - Login form */}
          <div className="w-full p-8 sm:p-10 md:p-12 md:w-1/2">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 text-center">
                {/* Logo skeleton */}
                <Skeleton className="mx-auto mb-6 h-20 w-40" />
              </div>

              {/* Login form skeleton - matches LoginForm.tsx exactly */}
              <div className="space-y-6">
                <div className="text-left">
                  <Skeleton className="mb-2 h-8 w-24" />
                </div>

                {/* Message / alert placeholder */}
                <Skeleton className="h-5 w-full rounded" />

                {/* Email or Username field */}
                <div>
                  <Skeleton className="mb-1 h-5 w-40" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>

                {/* Password field with toggle icon */}
                <div>
                  <Skeleton className="mb-1 h-5 w-28" />
                  <div className="relative">
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full" />
                  </div>
                </div>

                {/* Remember me checkbox */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>

                {/* Login button */}
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Right side - Image */}
          <div className="relative w-full md:w-1/2">
            <div className="min-h-[220px] md:min-h-full">
              <Skeleton className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-10 left-0 w-full px-10">
                <Skeleton className="h-8 w-56 max-w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
