"use client";

import { Button } from "@/components/ui/button";
import type { PaginationData } from "@/lib/types/sessions";

type SessionsPaginationProps = {
  pagination: PaginationData | null;
  onPageChange: (page: number) => void;
};

/**
 * Sessions Pagination Component
 * Handles pagination controls for sessions list
 */
export default function SessionsPagination({
  pagination,
  onPageChange,
}: SessionsPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      {/* Mobile Pagination */}
      <div className="flex flex-col space-y-3 w-full sm:hidden">
        <div className="text-xs text-gray-600 text-center">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="px-2 py-1 text-xs">««</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={!hasPrevPage} className="px-2 py-1 text-xs">‹</Button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">Page</span>
            <input 
              type="number" 
              min={1} 
              max={totalPages} 
              value={currentPage} 
              onChange={(e) => { 
                let val = Number(e.target.value); 
                if (isNaN(val)) val = 1; 
                if (val < 1) val = 1; 
                if (val > totalPages) val = totalPages; 
                onPageChange(val); 
              }} 
              className="w-12 px-1 py-1 border border-gray-300 rounded text-center text-xs text-gray-700 focus:ring-buttonActive focus:border-buttonActive" 
              aria-label="Page number" 
            />
            <span className="text-xs text-gray-600">of {totalPages}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={!hasNextPage} className="px-2 py-1 text-xs">›</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 text-xs">»»</Button>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
        <div>
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>First</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={!hasPrevPage}>Previous</Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Page</span>
            <input 
              type="number" 
              min={1} 
              max={totalPages} 
              value={currentPage} 
              onChange={(e) => { 
                let val = Number(e.target.value); 
                if (isNaN(val)) val = 1; 
                if (val < 1) val = 1; 
                if (val > totalPages) val = totalPages; 
                onPageChange(val); 
              }} 
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive" 
              aria-label="Page number" 
            />
            <span className="text-sm text-gray-600">of {totalPages}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={!hasNextPage}>Next</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>Last</Button>
        </div>
      </div>
    </div>
  );
}
