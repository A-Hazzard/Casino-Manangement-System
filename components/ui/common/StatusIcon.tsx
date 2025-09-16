"use client";

import { Circle } from "lucide-react";

type StatusIconProps = {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function StatusIcon({ 
  isOnline, 
  size = "md", 
  className = "" 
}: StatusIconProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Circle 
        className={`${sizeClasses[size]} ${
          isOnline 
            ? "text-green-500 fill-green-500" 
            : "text-red-500 fill-red-500"
        }`}
      />
      <span className="sr-only">
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}
