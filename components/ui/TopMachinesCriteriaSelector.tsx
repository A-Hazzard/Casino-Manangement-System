/**
 * Top Machines Criteria Selector Component
 * Allows users to select sorting criteria for Top Machines table (ME3-1.0 to ME3-1.4)
 *
 * Features:
 * - Clickable key metrics to select sorting criteria
 * - Visual arrow indicator showing currently selected criteria
 * - Arrow direction (up/down) indicates sort direction (ascending/descending)
 * - Click same metric to toggle sort direction
 *
 * @param selectedCriteria - Currently selected metric for sorting
 * @param sortDirection - Current sort direction ('asc' | 'desc')
 * @param onCriteriaChange - Callback when criteria is selected/changed
 */

'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TopMachinesCriteria =
  | 'locationName'
  | 'machineId'
  | 'gameTitle'
  | 'manufacturer'
  | 'coinIn'
  | 'netWin'
  | 'gross'
  | 'gamesPlayed'
  | 'actualHold'
  | 'theoreticalHold'
  | 'averageWager'
  | 'jackpot';

type TopMachinesCriteriaSelectorProps = {
  selectedCriteria: TopMachinesCriteria;
  sortDirection: 'asc' | 'desc';
  onCriteriaChange: (criteria: TopMachinesCriteria) => void;
};

const criteriaLabels: Record<TopMachinesCriteria, string> = {
  locationName: 'Location',
  machineId: 'Machine ID',
  gameTitle: 'Game',
  manufacturer: 'Manufacturer',
  coinIn: 'Handle',
  netWin: 'Net Win',
  gross: 'Gross',
  gamesPlayed: 'Games Played',
  actualHold: 'Actual Hold',
  theoreticalHold: 'Theoretical Hold',
  averageWager: 'Average Wager',
  jackpot: 'Jackpot',
};

export function TopMachinesCriteriaSelector({
  selectedCriteria,
  sortDirection,
  onCriteriaChange,
}: TopMachinesCriteriaSelectorProps) {
  const handleCriteriaClick = (criteria: TopMachinesCriteria) => {
    onCriteriaChange(criteria);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Sort by:</span>
      {Object.entries(criteriaLabels).map(([key, label]) => {
        const criteria = key as TopMachinesCriteria;
        const isSelected = selectedCriteria === criteria;

        return (
          <Button
            key={key}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCriteriaClick(criteria)}
            className="flex items-center gap-1"
          >
            <span>{label}</span>
            {isSelected ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4 opacity-30">
                <ChevronUp className="h-4 w-4" />
              </div>
            )}
          </Button>
        );
      })}
    </div>
  );
}

