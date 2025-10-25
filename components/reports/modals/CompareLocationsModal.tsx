'use client';

import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Trophy,
  Activity,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AggregatedLocation, TopLocation } from '@/shared/types';
import { ExportUtils } from '@/lib/utils/exportUtils';
import { toast } from 'sonner';

type CompareLocationsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: (AggregatedLocation | TopLocation)[];
  type: 'locations' | 'machines';
};

export default function CompareLocationsModal({
  isOpen,
  onClose,
  selectedItems,
  type,
}: CompareLocationsModalProps) {
  if (selectedItems.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getItemName = (item: AggregatedLocation | TopLocation) => {
    return item.locationName || 'Unknown Location';
  };

  const getItemMetrics = (item: AggregatedLocation | TopLocation) => {
    if ('gross' in item && 'drop' in item) {
      // TopLocation type
      return {
        gross: item.gross,
        drop: item.drop,
        cancelledCredits: item.cancelledCredits,
        onlineMachines: item.onlineMachines,
        totalMachines: item.totalMachines,
        holdPercentage: item.drop > 0 ? (item.gross / item.drop) * 100 : 0,
      };
    } else {
      // AggregatedLocation type
      return {
        gross: item.gross,
        moneyIn: item.moneyIn,
        moneyOut: item.moneyOut,
        totalMachines: item.totalMachines,
        onlineMachines: item.onlineMachines,
        holdPercentage:
          item.moneyIn > 0 ? (item.gross / item.moneyIn) * 100 : 0,
      };
    }
  };

  const handleExportComparison = async () => {
    try {
      const exportData = {
        title: `${
          type === 'locations' ? 'Locations' : 'Machines'
        } Comparison Report`,
        subtitle: `Detailed comparison of ${selectedItems.length} selected ${
          type === 'locations' ? 'locations' : 'machines'
        }`,
        headers: [
          'Location Name',
          'Gross Revenue',
          'Hold %',
          'Online Machines',
          'Total Machines',
          type === 'locations' ? 'Drop' : 'Money In',
          type === 'locations' ? 'Cancelled Credits' : 'Money Out',
        ],
        data: selectedItems.map(item => {
          const metrics = getItemMetrics(item);
          return [
            getItemName(item),
            metrics.gross.toLocaleString(),
            `${metrics.holdPercentage.toFixed(1)}%`,
            metrics.onlineMachines.toString(),
            metrics.totalMachines.toString(),
            ('drop' in metrics
              ? metrics.drop || 0
              : metrics.moneyIn || 0
            ).toLocaleString(),
            ('cancelledCredits' in metrics
              ? metrics.cancelledCredits || 0
              : metrics.moneyOut || 0
            ).toLocaleString(),
          ];
        }),
        summary: [
          {
            label: `Total ${type === 'locations' ? 'Locations' : 'Machines'}`,
            value: selectedItems.length.toString(),
          },
          {
            label: 'Total Revenue',
            value: `$${selectedItems
              .reduce((sum, item) => sum + getItemMetrics(item).gross, 0)
              .toLocaleString()}`,
          },
          {
            label: 'Total Machines',
            value: selectedItems
              .reduce(
                (sum, item) => sum + getItemMetrics(item).totalMachines,
                0
              )
              .toString(),
          },
          {
            label: 'Average Hold %',
            value: `${(
              selectedItems.reduce(
                (sum, item) => sum + getItemMetrics(item).holdPercentage,
                0
              ) / selectedItems.length
            ).toFixed(1)}%`,
          },
        ],
        metadata: {
          generatedBy: 'Comparison System',
          generatedAt: new Date().toISOString(),
          type: type,
          selectedCount: selectedItems.length,
        },
      };

      await ExportUtils.exportToExcel(exportData);
      toast.success(
        `${
          type === 'locations' ? 'Locations' : 'Machines'
        } comparison exported successfully`
      );
    } catch (error) {
      console.error('Error exporting comparison data:', error);
      toast.error('Failed to export comparison data');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="relative z-[9999] max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Compare {type === 'locations' ? 'Locations' : 'Machines'} (
              {selectedItems.length})
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportComparison}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedItems.map((item, index) => {
              const metrics = getItemMetrics(item);
              return (
                <Card key={index} className="border-2 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span className="truncate">{getItemName(item)}</span>
                      <Badge variant="secondary" className="ml-2">
                        #{index + 1}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">Gross Revenue</div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(metrics.gross)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Hold %</div>
                        <div className="font-semibold">
                          {metrics.holdPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Machines</div>
                        <div className="font-semibold">
                          {metrics.onlineMachines}/{metrics.totalMachines}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">
                          {type === 'locations' ? 'Drop' : 'Money In'}
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(
                            'drop' in metrics
                              ? metrics.drop || 0
                              : metrics.moneyIn || 0
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedItems.map((item, index) => {
                    const metrics = getItemMetrics(item);
                    const maxRevenue = Math.max(
                      ...selectedItems.map(i => getItemMetrics(i).gross)
                    );
                    const percentage =
                      maxRevenue > 0 ? (metrics.gross / maxRevenue) * 100 : 0;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {getItemName(item)}
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(metrics.gross)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Machine Count Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Machine Count Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedItems.map((item, index) => {
                    const metrics = getItemMetrics(item);
                    const maxMachines = Math.max(
                      ...selectedItems.map(i => getItemMetrics(i).totalMachines)
                    );
                    const percentage =
                      maxMachines > 0
                        ? (metrics.totalMachines / maxMachines) * 100
                        : 0;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {getItemName(item)}
                          </span>
                          <span className="font-semibold">
                            {metrics.onlineMachines}/{metrics.totalMachines}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Hold Percentage Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Hold Percentage Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedItems.map((item, index) => {
                    const metrics = getItemMetrics(item);
                    const maxHold = Math.max(
                      ...selectedItems.map(
                        i => getItemMetrics(i).holdPercentage
                      )
                    );
                    const percentage =
                      maxHold > 0
                        ? (metrics.holdPercentage / maxHold) * 100
                        : 0;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {getItemName(item)}
                          </span>
                          <span className="font-semibold">
                            {metrics.holdPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-yellow-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="rounded-lg bg-green-50 p-3">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          selectedItems.reduce(
                            (sum, item) => sum + getItemMetrics(item).gross,
                            0
                          )
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Total Revenue</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedItems.reduce(
                          (sum, item) =>
                            sum + getItemMetrics(item).totalMachines,
                          0
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total Machines
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      Average Hold:{' '}
                      {(
                        selectedItems.reduce(
                          (sum, item) =>
                            sum + getItemMetrics(item).holdPercentage,
                          0
                        ) / selectedItems.length
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
