import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CasinoMember as Member } from '@/shared/types/entities';
import { formatCurrency } from '@/lib/utils/formatters';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';

type PlayerTotalsCardProps = {
  member: Member;
  showTotals: boolean;
  handleToggleTotals: () => void;
};

const StatCard = ({
  title,
  value,
  colorClass,
}: {
  title: string;
  value: string | number;
  colorClass?: string;
}) => (
  <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
    <p className="mb-1 text-sm text-gray-500">{title}</p>
    <p className={`text-xl font-bold ${colorClass || 'text-gray-800'}`}>
      {value}
    </p>
  </div>
);

export default function PlayerTotalsCard({
  member,
  showTotals,
  handleToggleTotals,
}: PlayerTotalsCardProps) {
  const { formatAmount, shouldShowCurrency } = useCurrencyFormat();
  const totalWonLoss = (member.sessions || []).reduce(
    (acc, s) => acc + (s.won || 0) - (s.bet || 0),
    0
  );
  const totalBet = (member.sessions || []).reduce(
    (acc, s) => acc + (s.bet || 0),
    0
  );
  const totalGamesPlayed = (member.sessions || []).reduce(
    (acc, s) => acc + (s.gamesPlayed || 0),
    0
  );
  const wonLossColor = totalWonLoss >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={handleToggleTotals}
      >
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">Player&apos;s Totals</h2>
          {!showTotals && (
            <div className="mt-2 flex flex-wrap gap-4">
              <p className="text-sm">
                <span className="font-semibold">Points:</span>{' '}
                {member.points || 0}
              </p>
              <p className="text-sm">
                <span className="font-semibold">No. Of Sessions:</span>{' '}
                {member.sessions?.length || 0}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-sm font-semibold">See More</span>
          <ChevronDown
            className={`h-6 w-6 transition-transform ${
              showTotals ? 'rotate-180 transform' : ''
            }`}
          />
        </div>
      </div>

      {showTotals && (
        <div className="mt-4">
          <div className="mb-6 flex flex-wrap gap-4">
            <p>
              <span className="font-semibold">Points:</span>{' '}
              {member.points || 0}
            </p>
            <p>
              <span className="font-semibold">No. Of Sessions:</span>{' '}
              {member.sessions?.length || 0}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              title="Account Balance"
              value={
                shouldShowCurrency()
                  ? formatAmount(member.uaccount || 0)
                  : formatCurrency(member.uaccount || 0)
              }
            />
            <StatCard title="Points Balance" value={member.points || 0} />
            <StatCard
              title="Total Balance"
              value={
                shouldShowCurrency()
                  ? formatAmount(member.uaccount || 0)
                  : formatCurrency(member.uaccount || 0)
              }
            />
            <StatCard
              title="Won/Loss"
              value={
                shouldShowCurrency()
                  ? formatAmount(totalWonLoss)
                  : formatCurrency(totalWonLoss)
              }
              colorClass={wonLossColor}
            />
            <StatCard
              title="Total Bet"
              value={
                shouldShowCurrency()
                  ? formatAmount(totalBet)
                  : formatCurrency(totalBet)
              }
            />
            <StatCard title="Total Games Played" value={totalGamesPlayed} />
          </div>
        </div>
      )}
    </div>
  );
}
