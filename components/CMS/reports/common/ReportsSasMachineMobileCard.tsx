'use client';

import ReportsMachineCard, {
  type ReportsMachineCardMetric,
} from '@/components/CMS/reports/common/ReportsMachineCard';
import { getFinancialColorClass } from '@/lib/utils/financial';

type SasMachineCardData = {
  machineId?: string;
  machineName?: string;
  serialNumber?: string;
  customName?: string;
  locationId?: string;
  locationName?: string;
  gameTitle?: string;
  manufacturer?: string;
  drop?: number;
  netWin?: number;
  jackpot?: number;
  avgBet?: number;
  actualHold?: number | null;
  theoreticalHold?: number | null;
  gamesPlayed?: number;
  coinIn?: number;
};

type ReportsSasMachineMobileCardProps = {
  machine: SasMachineCardData;
  formatCurrency: (value: number) => string;
  floorPositionPercent: number;
};

export default function ReportsSasMachineMobileCard({
  machine,
  formatCurrency,
  floorPositionPercent,
}: ReportsSasMachineMobileCardProps) {
  const machineTitle =
    machine.machineName ||
    machine.customName ||
    machine.serialNumber ||
    'Unknown Machine';

  const metrics: ReportsMachineCardMetric[] = [
    {
      label: 'Money In',
      value: formatCurrency(machine.drop || 0),
      valueClassName: getFinancialColorClass(machine.drop),
    },
    {
      label: 'Win/Loss',
      value: formatCurrency(machine.netWin || 0),
      valueClassName: getFinancialColorClass(machine.netWin),
    },
    {
      label: 'Jackpot',
      value: formatCurrency(machine.jackpot || 0),
      valueClassName: getFinancialColorClass(machine.jackpot),
    },
    {
      label: 'Avg. Wag. per Game',
      value: formatCurrency(machine.avgBet || 0),
    },
    {
      label: 'Actual Hold',
      value:
        machine.actualHold != null && !Number.isNaN(machine.actualHold)
          ? `${machine.actualHold.toFixed(2)}%`
          : 'N/A',
      valueClassName: 'text-gray-600',
    },
    {
      label: 'Games Played',
      value: (machine.gamesPlayed || 0).toLocaleString(),
    },
    {
      label: 'Floor Position',
      value: `${floorPositionPercent.toFixed(2)}%`,
    },
    {
      label: 'Handle',
      value: formatCurrency(machine.coinIn || 0),
      valueClassName: getFinancialColorClass(machine.coinIn),
    },
  ];

  return (
    <ReportsMachineCard
      title={machineTitle}
      machineHref={
        machine.machineId ? `/cabinets/${machine.machineId}` : undefined
      }
      subtitle={
        <>
          {machine.manufacturer ? (
            <span>{machine.manufacturer}</span>
          ) : null}
          {machine.manufacturer && machine.gameTitle ? ' • ' : null}
          {machine.gameTitle ? (
            machine.gameTitle
          ) : (
            <span className="text-red-600">(game name not provided)</span>
          )}
        </>
      }
      locationName={machine.locationName}
      locationHref={
        machine.locationId ? `/locations/${machine.locationId}` : undefined
      }
      metrics={metrics}
    />
  );
}
