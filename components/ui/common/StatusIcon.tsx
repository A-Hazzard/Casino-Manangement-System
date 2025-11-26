/**
 * Status Icon Component
 * Icon component for displaying online/offline status.
 *
 * Features:
 * - Online/offline status indicator
 * - Size variants (sm, md, lg)
 * - Color-coded status
 * - Accessible labels
 *
 * @param isOnline - Whether status is online
 * @param size - Icon size (sm, md, lg)
 * @param className - Additional CSS classes
 */
'use client';

import { Circle } from 'lucide-react';

type StatusIconProps = {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function StatusIcon({
  isOnline,
  size = 'md',
  className = '',
}: StatusIconProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Circle
        className={`${sizeClasses[size]} ${
          isOnline
            ? 'fill-green-500 text-green-500'
            : 'fill-red-500 text-red-500'
        }`}
      />
      <span className="sr-only">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
