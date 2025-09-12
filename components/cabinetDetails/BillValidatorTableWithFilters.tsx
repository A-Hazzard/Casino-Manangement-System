import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BillValidatorDateFilter from "@/components/ui/BillValidatorDateFilter";
import type { TimePeriod } from "@/app/api/lib/types";

export type AcceptedBill = {
  denomination: number;
  quantity: number;
  timestamp?: string | Date;
  location?: string;
  machineId?: string;
};

type BillValidatorTableWithFiltersProps = {
  bills: AcceptedBill[];
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  onTimePeriodChange?: (timePeriod: TimePeriod) => void;
  onTimeRangeChange?: (timeRange: { startTime: string; endTime: string } | undefined) => void;
  dateRange?: { from: Date; to: Date } | undefined;
  timePeriod?: TimePeriod;
  timeRange?: { startTime: string; endTime: string } | undefined;
  loading?: boolean;
};

const DEFAULT_DENOMS = [20, 100, 500, 1000, 2000, 5000];

export const BillValidatorTableWithFilters: React.FC<BillValidatorTableWithFiltersProps> = ({
  bills,
  onDateRangeChange,
  onTimePeriodChange,
  onTimeRangeChange,
  dateRange: _dateRange,
  timePeriod: _timePeriod,
  timeRange: _timeRange,
  loading = false,
}) => {
  const [filters, setFilters] = useState({
    denomination: "all",
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      denomination: "all",
    });
  };

  // Get unique denominations from data
  const uniqueDenominations = useMemo(() => {
    const denoms = new Set<number>();
    bills.forEach((bill) => {
      denoms.add(bill.denomination);
    });
    return Array.from(denoms).sort((a, b) => a - b);
  }, [bills]);

  // Filter and process data
  const filteredAndProcessedData = useMemo(() => {
    let filtered = bills;

    // Filter by denomination
    if (filters.denomination !== "all") {
      const selectedDenom = parseInt(filters.denomination);
      filtered = filtered.filter((bill) => bill.denomination === selectedDenom);
    }

    // Note: Date filtering for Bill Validator is currently limited because
    // billMeters contains current totals, not historical individual bill entries.
    // For proper historical filtering, a new API endpoint would be needed
    // that returns bill validator data based on date ranges.

    // Group and sum quantities by denomination
    const denomMap = new Map<number, number>();
    for (const bill of filtered) {
      denomMap.set(
        bill.denomination,
        (denomMap.get(bill.denomination) || 0) + bill.quantity
      );
    }

    // Create table rows - only show denominations that have data OR are specifically filtered
    let denomsToShow: number[];
    
    if (filters.denomination !== "all") {
      // If filtering by specific denomination, only show that one
      const selectedDenom = parseInt(filters.denomination);
      denomsToShow = [selectedDenom];
    } else {
      // If no denomination filter, show all denominations that have data
      denomsToShow = [...new Set([...DEFAULT_DENOMS, ...uniqueDenominations])].sort((a, b) => a - b);
    }

    const tableRows = denomsToShow.map((denom) => {
      const quantity = denomMap.get(denom) || 0;
      const subtotal = quantity * denom;
      return { denomination: denom, quantity, subtotal };
    });

    const totalQty = tableRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = tableRows.reduce((sum, r) => sum + r.subtotal, 0);

    return {
      rows: tableRows,
      totalQty,
      totalAmount,
      filteredCount: filtered.length,
    };
  }, [bills, filters, uniqueDenominations]);

  return (
    <div className="w-full">
      {/* Date, Time, and Denomination Filter */}
      <div className="mb-6">
        <BillValidatorDateFilter
          onDateRangeChange={onDateRangeChange}
          onTimePeriodChange={onTimePeriodChange}
          onTimeRangeChange={onTimeRangeChange}
          onDenominationChange={(value) => handleFilterChange("denomination", value)}
          denomination={filters.denomination}
          uniqueDenominations={uniqueDenominations}
          disabled={loading}
        />
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {filteredAndProcessedData.filteredCount} bills
        </div>
        <Button variant="outline" onClick={clearFilters} size="sm">
          Clear Filters
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Denomination</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead className="text-center">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndProcessedData.rows.map((row) => (
              <TableRow key={row.denomination}>
                <TableCell className="text-center font-medium">
                  {formatCurrency(row.denomination)}
                </TableCell>
                <TableCell className="text-center">{row.quantity}</TableCell>
                <TableCell className="text-center">
                  {formatCurrency(row.subtotal)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-gray-50">
              <TableCell className="text-center">Total</TableCell>
              <TableCell className="text-center">
                {filteredAndProcessedData.totalQty}
              </TableCell>
              <TableCell className="text-center">
                {formatCurrency(filteredAndProcessedData.totalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredAndProcessedData.rows.map((row) => (
          <div
            key={row.denomination}
            className="bg-white p-4 rounded-lg shadow border"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{formatCurrency(row.denomination)}</div>
                <div className="text-sm text-gray-600">Quantity: {row.quantity}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(row.subtotal)}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Total Card */}
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-300">
          <div className="flex justify-between items-center">
            <div className="font-bold">Total</div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                {filteredAndProcessedData.totalQty} bills
              </div>
              <div className="font-bold text-lg">
                {formatCurrency(filteredAndProcessedData.totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
