'use client';

import { Input } from '@/components/shared/ui/input';
import type { SmibDevice } from '@/shared/types/entities';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type CabinetsSMIBListProps = {
  smibs: SmibDevice[];
  onSelect: (relayId: string) => void;
};

const getStatus = (smib: SmibDevice): 'online' | 'offline' =>
  typeof smib.online === 'boolean' ? (smib.online ? 'online' : 'offline') : 'offline';

export function CabinetsSMIBList({ smibs, onSelect }: CabinetsSMIBListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return smibs;
    const term = search.toLowerCase();
    return smibs.filter(
      s =>
        s.relayId.toLowerCase().includes(term) ||
        s.serialNumber?.toLowerCase().includes(term) ||
        s.game?.toLowerCase().includes(term) ||
        s.locationName?.toLowerCase().includes(term)
    );
  }, [smibs, search]);

  const onlineCount = smibs.filter(s => getStatus(s) === 'online').length;
  const offlineCount = smibs.length - onlineCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{smibs.length} SMIBs</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {onlineCount} online
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            {offlineCount} offline
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by relay ID, serial, game, location…"
            className="h-9 w-full rounded-md border border-gray-300 bg-white pl-3 pr-9 text-sm placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Relay ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Serial
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Game
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  No SMIBs match your search.
                </td>
              </tr>
            ) : (
              filtered.map(smib => {
                const status = getStatus(smib);
                return (
                  <tr
                    key={`${smib.relayId}-${smib.machineId}`}
                    onClick={() => onSelect(smib.relayId)}
                    className="cursor-pointer transition-colors hover:bg-purple-50"
                  >
                    {/* Status dot */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          status === 'online'
                            ? 'animate-pulse bg-emerald-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {smib.relayId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {smib.serialNumber ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {smib.game ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {smib.locationName ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No SMIBs match your search.
          </p>
        ) : (
          filtered.map(smib => {
            const status = getStatus(smib);
            return (
              <button
                key={`${smib.relayId}-${smib.machineId}`}
                type="button"
                onClick={() => onSelect(smib.relayId)}
                className="flex w-full items-start justify-between rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-purple-50"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-gray-900">{smib.relayId}</span>
                  {smib.serialNumber && (
                    <span className="text-xs text-gray-500">Serial: {smib.serialNumber}</span>
                  )}
                  {smib.game && (
                    <span className="text-xs text-gray-500">Game: {smib.game}</span>
                  )}
                  {smib.locationName && (
                    <span className="text-xs text-gray-500">Location: {smib.locationName}</span>
                  )}
                </div>
                <span
                  className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${
                    status === 'online' ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status === 'online' ? 'animate-pulse bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  {status === 'online' ? 'Online' : 'Offline'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
