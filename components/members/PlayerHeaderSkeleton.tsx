import React from "react";

export default function PlayerHeaderSkeleton() {
  return (
    <div className="flex items-center my-8">
      <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse mr-6"></div>
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}
