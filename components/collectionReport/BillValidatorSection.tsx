"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BillValidatorTimePeriod,
  BillValidatorFormData,
  ProcessedBillData,
  BillValidatorSummary,
} from "@/shared/types/billValidator";
import type { BillValidatorData as DatabaseBillValidatorData } from "@/shared/types/database";

// Flexible bill meters type that can handle both cabinet and bill validator data
type FlexibleBillMetersData = {
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar200?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  dollarTotalUnknown?: number;
};

type BillValidatorSectionProps = {
  machineId: string;
  billValidator?: DatabaseBillValidatorData;
  billMeters?: FlexibleBillMetersData;
  timePeriod?: BillValidatorTimePeriod;
  onTimePeriodChange?: (period: BillValidatorTimePeriod) => void;
  onCollect?: (formData: BillValidatorFormData) => void;
  isCollecting?: boolean;
};

// Standard denominations
const STANDARD_DENOMINATIONS = [
  { value: 1, label: "$1" },
  { value: 2, label: "$2" },
  { value: 5, label: "$5" },
  { value: 10, label: "$10" },
  { value: 20, label: "$20" },
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
  { value: 200, label: "$200" },
  { value: 500, label: "$500" },
  { value: 1000, label: "$1000" },
  { value: 2000, label: "$2000" },
  { value: 5000, label: "$5000" },
];

// Time period options
const TIME_PERIOD_OPTIONS: { value: BillValidatorTimePeriod; label: string }[] =
  [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

export const BillValidatorSection: React.FC<BillValidatorSectionProps> = ({
  machineId: _machineId,
  billValidator,
  billMeters,
  timePeriod = "today",
  onTimePeriodChange,
  onCollect,
  isCollecting = false,
}) => {
  const [showCollectForm, setShowCollectForm] = useState(false);
  const [collectFormData, setCollectFormData] = useState<BillValidatorFormData>(
    {}
  );

  // Process bill meters data (V2 - from machine.billMeters)
  // Note: This component should use the UnifiedBillValidator API for location-specific denomination filtering
  const processedBillMeters = useMemo(() => {
    if (!billMeters)
      return {
        processed: [],
        totalQuantity: 0,
        totalAmount: 0,
        totalUnknown: 0,
      };

    const processed: ProcessedBillData[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    // Map billMeters keys to denominations
    const meterMap = [
      { key: "dollar1", value: 1, label: "$1" },
      { key: "dollar2", value: 2, label: "$2" },
      { key: "dollar5", value: 5, label: "$5" },
      { key: "dollar10", value: 10, label: "$10" },
      { key: "dollar20", value: 20, label: "$20" },
      { key: "dollar50", value: 50, label: "$50" },
      { key: "dollar100", value: 100, label: "$100" },
      { key: "dollar200", value: 200, label: "$200" },
      { key: "dollar500", value: 500, label: "$500" },
      { key: "dollar1000", value: 1000, label: "$1000" },
      { key: "dollar2000", value: 2000, label: "$2000" },
      { key: "dollar5000", value: 5000, label: "$5000" },
    ];

    meterMap.forEach(({ key, value, label }) => {
      const quantity = billMeters[key as keyof FlexibleBillMetersData] || 0;
      const subtotal = quantity * value;

      if (quantity > 0) {
        processed.push({
          denomination: value,
          label,
          quantity,
          subtotal,
        });
        totalQuantity += quantity;
        totalAmount += subtotal;
      }
    });

    const totalUnknown = billMeters.dollarTotalUnknown || 0;

    return { processed, totalQuantity, totalAmount, totalUnknown };
  }, [billMeters]);

  // Process regular bill validator data (from machine.billValidator.notes)
  const processedBillValidator = useMemo(() => {
    if (!billValidator?.notes)
      return { processed: [], totalQuantity: 0, totalAmount: 0 };

    const processed: ProcessedBillData[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    billValidator.notes.forEach((note) => {
      const subtotal = note.denomination * note.quantity;
      processed.push({
        denomination: note.denomination,
        label: `$${note.denomination}`,
        quantity: note.quantity,
        subtotal,
      });
      totalQuantity += note.quantity;
      totalAmount += subtotal;
    });

    return { processed, totalQuantity, totalAmount };
  }, [billValidator]);

  // Calculate summary
  const summary: BillValidatorSummary = useMemo(() => {
    const currentBalance = billValidator?.balance ?? 0;
    const v2Total =
      processedBillMeters.totalAmount + processedBillMeters.totalUnknown;

    return {
      totalQuantity: processedBillValidator.totalQuantity,
      totalAmount: processedBillValidator.totalAmount,
      totalUnknown: processedBillMeters.totalUnknown,
      grandTotal: v2Total,
      currentBalance,
    };
  }, [billValidator, processedBillValidator, processedBillMeters]);

  // Handle collect form submission
  const handleCollectSubmit = () => {
    if (onCollect) {
      onCollect(collectFormData);
    }
    setShowCollectForm(false);
    setCollectFormData({});
  };

  // Handle collect form input change
  const handleCollectFormChange = (denomination: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setCollectFormData((prev) => ({
      ...prev,
      [`note_${denomination}`]: numValue,
    }));
  };

  // Calculate collect form total
  const collectFormTotal = useMemo(() => {
    return Object.entries(collectFormData).reduce((total, [key, value]) => {
      const denomination = parseInt(key.replace("note_", ""));
      return total + denomination * (value || 0);
    }, 0);
  }, [collectFormData]);

  return (
    <div className="w-full space-y-6">
      {/* Header with Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bill Validator</span>
            <Badge variant="outline" className="text-lg font-semibold">
              Balance: {formatCurrency(summary.currentBalance)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Time Period Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TIME_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={timePeriod === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onTimePeriodChange?.(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Bills (V1)</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(summary.totalAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Bills (V2)</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Unknown Bills</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(summary.totalUnknown)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Bill Validator Tabs */}
      <Tabs defaultValue="v1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="v1">Bill Validator V1</TabsTrigger>
          <TabsTrigger value="v2">Bill Validator V2</TabsTrigger>
        </TabsList>

        {/* Bill Validator V1 Tab */}
        <TabsContent value="v1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Bill Validator V1 (machine.billValidator.notes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processedBillValidator.processed.length > 0 ? (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="py-3 px-4 text-center rounded-tl-lg">
                            Denomination
                          </th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-center rounded-tr-lg">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedBillValidator.processed.map((bill) => (
                          <tr
                            key={bill.denomination}
                            className="border-b border-gray-200"
                          >
                            <td className="py-3 px-4 text-center font-medium">
                              {bill.label}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {bill.quantity}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {formatCurrency(bill.subtotal)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-bold">
                          <td className="py-3 px-4 rounded-bl-lg">Total</td>
                          <td className="py-3 px-4">
                            {processedBillValidator.totalQuantity}
                          </td>
                          <td className="py-3 px-4 rounded-br-lg">
                            {formatCurrency(processedBillValidator.totalAmount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block lg:hidden space-y-3">
                    {processedBillValidator.processed.map((bill) => (
                      <Card key={bill.denomination}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{bill.label}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {bill.quantity}
                              </p>
                            </div>
                            <p className="text-lg font-bold">
                              {formatCurrency(bill.subtotal)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No bill validator data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bill Validator V2 Tab */}
        <TabsContent value="v2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bill Validator V2 (machine.billMeters)</CardTitle>
            </CardHeader>
            <CardContent>
              {processedBillMeters.processed.length > 0 ? (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead>
                        <tr className="bg-green-600 text-white">
                          <th className="py-3 px-4 text-center rounded-tl-lg">
                            Denomination
                          </th>
                          <th className="py-3 px-4 text-center">Quantity</th>
                          <th className="py-3 px-4 text-center rounded-tr-lg">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedBillMeters.processed.map((bill) => (
                          <tr
                            key={bill.denomination}
                            className="border-b border-gray-200"
                          >
                            <td className="py-3 px-4 text-center font-medium">
                              {bill.label}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {bill.quantity}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {formatCurrency(bill.subtotal)}
                            </td>
                          </tr>
                        ))}

                        {/* Unknown Bills Row */}
                        {processedBillMeters.totalUnknown > 0 && (
                          <tr className="border-b border-gray-200 bg-yellow-50">
                            <td className="py-3 px-4 font-medium text-yellow-800">
                              Unknown Bills
                            </td>
                            <td className="py-3 px-4 text-yellow-800">-</td>
                            <td className="py-3 px-4 text-yellow-800">
                              {formatCurrency(processedBillMeters.totalUnknown)}
                            </td>
                          </tr>
                        )}

                        <tr className="bg-gray-100 font-bold">
                          <td className="py-3 px-4 rounded-bl-lg">Total</td>
                          <td className="py-3 px-4">
                            {processedBillMeters.totalQuantity}
                          </td>
                          <td className="py-3 px-4 rounded-br-lg">
                            {formatCurrency(
                              processedBillMeters.totalAmount +
                                processedBillMeters.totalUnknown
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block lg:hidden space-y-3">
                    {processedBillMeters.processed.map((bill) => (
                      <Card key={bill.denomination}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{bill.label}</p>
                              <p className="text-sm text-gray-600">
                                Quantity: {bill.quantity}
                              </p>
                            </div>
                            <p className="text-lg font-bold">
                              {formatCurrency(bill.subtotal)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Unknown Bills Card */}
                    {processedBillMeters.totalUnknown > 0 && (
                      <Card className="border-yellow-300">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-yellow-800">
                                Unknown Bills
                              </p>
                            </div>
                            <p className="text-lg font-bold text-yellow-600">
                              {formatCurrency(processedBillMeters.totalUnknown)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No bill meters data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Collect Button and Form */}
      <Card>
        <CardContent className="p-6">
          {!showCollectForm ? (
            <div className="text-center">
              <Button
                onClick={() => setShowCollectForm(true)}
                disabled={isCollecting}
                className="w-full md:w-auto"
              >
                {isCollecting ? "Collecting..." : "Collect Bills"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Collect Bills</h3>

              {/* Collect Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STANDARD_DENOMINATIONS.slice(0, 6).map(({ value, label }) => (
                  <div key={value} className="space-y-2">
                    <Label htmlFor={`collect_${value}`}>{label}</Label>
                    <Input
                      id={`collect_${value}`}
                      type="number"
                      min="0"
                      step="1"
                      value={
                        collectFormData[
                          `note_${value}` as keyof BillValidatorFormData
                        ] || ""
                      }
                      onChange={(e) =>
                        handleCollectFormChange(value, e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">
                    Total to Collect:
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(collectFormTotal)}
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCollectForm(false);
                    setCollectFormData({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCollectSubmit}
                  disabled={isCollecting || collectFormTotal === 0}
                >
                  {isCollecting ? "Collecting..." : "Submit Collection"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillValidatorSection;
