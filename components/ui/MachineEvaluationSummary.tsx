/**
 * Machine Evaluation Summary Component
 * Card component displaying machine evaluation summary statistics.
 *
 * Features:
 * - Percentage of top machines display
 * - Percentage of top machine coin-in display
 * - Summary text formatting
 * - Card layout
 *
 * @param percOfTopMachines - Percentage of top machines
 * @param percOfTopMachCoinIn - Percentage of top machine coin-in
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MachineEvaluationSummaryProps = {
  percOfTopMachines: number;
  percOfTopMachCoinIn: number;
};

export function MachineEvaluationSummary({
  percOfTopMachines,
  percOfTopMachCoinIn,
}: MachineEvaluationSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <h5 className="text-base font-medium text-gray-700">
            {percOfTopMachines.toFixed(1)}% of the machines contribute to{' '}
            {percOfTopMachCoinIn.toFixed(1)}% of the Total Handle
          </h5>
        </div>
      </CardContent>
    </Card>
  );
}
