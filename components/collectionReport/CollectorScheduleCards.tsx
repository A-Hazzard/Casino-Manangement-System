import React from "react";
import { formatDistanceToNow } from "date-fns";
import { CollectorScheduleCardsProps } from "@/lib/types/componentProps";

export default function CollectorScheduleCards({ data, loading }: CollectorScheduleCardsProps) {
  if (loading) {
    return (
      <div className="md:hidden space-y-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="md:hidden mt-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Collector Schedules Found</h3>
          <p className="text-gray-500">There are currently no collector schedules matching your criteria.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="md:hidden space-y-4 mt-4">
      {data.map((schedule, index) => {
        const startTime = new Date(schedule.startTime);
        const endTime = new Date(schedule.endTime);
        const duration = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
        
        return (
          <div key={schedule._id || index} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-buttonActive">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{schedule.collector}</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                {schedule.status}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Location:</span>
                <span className="text-sm font-medium text-gray-900">{schedule.location}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Duration:</span>
                <span className="text-sm font-medium text-gray-900">{duration} hours</span>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Start:</span>
                    <div className="font-medium text-gray-900">
                      {startTime.toLocaleDateString()}
                    </div>
                    <div className="font-medium text-gray-900">
                      {startTime.toLocaleTimeString()}
                    </div>
                    <div className="text-gray-500">
                      {formatDistanceToNow(startTime, { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">End:</span>
                    <div className="font-medium text-gray-900">
                      {endTime.toLocaleDateString()}
                    </div>
                    <div className="font-medium text-gray-900">
                      {endTime.toLocaleTimeString()}
                    </div>
                    <div className="text-gray-500">
                      {formatDistanceToNow(endTime, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
