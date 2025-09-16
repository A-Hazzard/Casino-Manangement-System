import React from "react";
import { ChevronDown } from "lucide-react";
import { Member } from "@/lib/types/members";
import { formatCurrency } from "@/lib/utils/formatters";

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
  <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
    <p className="text-sm text-gray-500 mb-1">{title}</p>
    <p className={`text-xl font-bold ${colorClass || "text-gray-800"}`}>
      {value}
    </p>
  </div>
);

export default function PlayerTotalsCard({
  member,
  showTotals,
  handleToggleTotals,
}: PlayerTotalsCardProps) {
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
  const wonLossColor = totalWonLoss >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={handleToggleTotals}
      >
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">Player&apos;s Totals</h2>
          {!showTotals && (
            <div className="flex flex-wrap gap-4 mt-2">
              <p className="text-sm">
                <span className="font-semibold">Points:</span>{" "}
                {member.points || 0}
              </p>
              <p className="text-sm">
                <span className="font-semibold">No. Of Sessions:</span>{" "}
                {member.sessions?.length || 0}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <span className="text-sm font-semibold mr-2">See More</span>
          <ChevronDown
            className={`h-6 w-6 transition-transform ${
              showTotals ? "transform rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {showTotals && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-4 mb-6">
            <p>
              <span className="font-semibold">Points:</span>{" "}
              {member.points || 0}
            </p>
            <p>
              <span className="font-semibold">No. Of Sessions:</span>{" "}
              {member.sessions?.length || 0}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Free Play Credits"
              value={formatCurrency(member.freePlayCredits || 0)}
            />
            <StatCard
              title="Account Balance"
              value={formatCurrency(member.accountBalance || 0)}
            />
            <StatCard
              title="Total Balance"
              value={formatCurrency(
                (member.accountBalance || 0) + (member.freePlayCredits || 0)
              )}
            />
            <StatCard
              title="Won/Loss"
              value={formatCurrency(totalWonLoss)}
              colorClass={wonLossColor}
            />
            <StatCard title="Total Bet" value={formatCurrency(totalBet)} />
            <StatCard title="Total Games Played" value={totalGamesPlayed} />
          </div>
        </div>
      )}
    </div>
  );
}
